#!/usr/bin/env node
// Verse Atlas web server.
//
//   node server.mjs              → http://localhost:8080
//
// Serves the static site in ./site and adds API routes:
//   GET  /api/citizen/:handle     public RSI citizen profile (name, avatar, org, enlisted…)
//   GET  /api/health
// With DATABASE_URL + Discord credentials set, also optional accounts:
//   GET  /auth/discord            start "Sign in with Discord"
//   GET  /auth/discord/callback
//   POST /auth/logout
//   GET  /api/me                  current user (or { enabled:false } when accounts are off)
//   GET  /api/state               everything the user has saved
//   PUT  /api/state/:key          save one item (fleet, rep, repLog, guideDone, prefs)
//   POST /api/rsi/claim           { handle } → a code to put in the RSI bio
//   POST /api/rsi/verify          checks the bio for the code
//   POST /api/rsi/unlink
//   POST /api/profile             { publicFleet: bool }
//   GET  /api/u/:handle           someone's public fleet
//   GET  /api/suggestions         suggestion board (?sort=top|new&status=)
//   POST /api/suggestions         { title, body, category }
//   POST /api/suggestions/:id/vote   { on: bool }
//   POST /api/suggestions/:id/status { status, note }   (admins)
//   DELETE /api/suggestions/:id      (author or admin)
//   GET  /api/export              download all of your data
//   POST /api/delete-account
//
// Environment: PORT, DATABASE_URL, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET,
// PUBLIC_URL (e.g. https://verseatlas.up.railway.app; used for the OAuth redirect),
// ADMIN_DISCORD_IDS (comma-separated Discord user IDs who can moderate suggestions).

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as db from './server/db.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.env.PORT) || 8080;
const RSI = 'https://robertsspaceindustries.com';
const DISCORD = process.env.DISCORD_BASE_URL || 'https://discord.com'; // overridable for tests
const SESSION_COOKIE = 'va_sid';
const STATE_COOKIE = 'va_oauth';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

// ---------------------------------------------------------------- RSI citizen pages
const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;

const decode = s => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

function field(html, label) {
  const re = new RegExp(`<span class="label">\\s*${label}\\s*</span>\\s*<strong class="value[^"]*">([\\s\\S]*?)</strong>`, 'i');
  const m = html.match(re);
  return m ? decode(m[1].replace(/<[^>]+>/g, '')) || null : null;
}

export function parseCitizen(html, handle) {
  if (!/class="profile-content/.test(html)) return null;
  const abs = src => (src ? (src.startsWith('http') ? src : RSI + src) : null);
  const profile = html.slice(html.indexOf('class="profile left-col"'));
  const moniker = (profile.match(/<div class="info">\s*<p class="entry">\s*<strong class="value">([\s\S]*?)<\/strong>/) || [])[1];
  const avatar = (profile.match(/<div class="thumb">\s*<img src="([^"]+)"/) || [])[1];
  const badge = (profile.match(/<span class="icon">\s*<img src="[^"]+"\s*\/?>\s*<\/span>\s*<span class="value">([\s\S]*?)<\/span>/) || [])[1];
  const record = (html.match(/UEE Citizen Record<\/span>\s*<strong class="value">([^<]*)<\/strong>/) || [])[1];

  let org = null;
  const orgBlock = html.match(/<div class="main-org right-col visibility-(\w)">([\s\S]*?)<span class="deco-separator top">/);
  if (orgBlock && orgBlock[1] === 'V') {
    const b = orgBlock[2];
    const sid = (b.match(/href="\/orgs\/([^"]+)"/) || [])[1];
    const name = (b.match(/<a href="\/orgs\/[^"]+" class="value[^"]*">([\s\S]*?)<\/a>/) || [])[1];
    const logo = (b.match(/<img src="([^"]+)"/) || [])[1];
    org = { sid: sid || null, name: name ? decode(name) : null, logo: abs(logo), rank: field(b, 'Organization rank'), url: sid ? `${RSI}/orgs/${sid}` : null };
  }

  const bio = (html.match(/<div class="entry bio">[\s\S]*?<div class="value">([\s\S]*?)<\/div>/) || [])[1];
  return {
    handle: field(html, 'Handle name') || handle,
    moniker: moniker ? decode(moniker) : null,
    avatar: abs(avatar),
    badge: badge ? decode(badge) : null,
    record: record ? decode(record) : null,
    enlisted: field(html, 'Enlisted'),
    location: field(html, 'Location')?.replace(/\s+,/g, ',') || null,
    fluency: field(html, 'Fluency'),
    bio: bio ? decode(bio.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')) : null,
    org,
    url: `${RSI}/citizens/${encodeURIComponent(handle)}`,
    fetchedAt: new Date().toISOString(),
  };
}

async function citizen(handle, { fresh = false } = {}) {
  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const res = await fetch(`${RSI}/en/citizens/${encodeURIComponent(handle)}`, {
    headers: { 'User-Agent': 'VerseAtlas (fan site; citizen lookup)', Accept: 'text/html' },
    redirect: 'follow',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw httpError(502, `RSI responded ${res.status}`);
  const data = parseCitizen(await res.text(), handle);
  cache.set(key, { at: Date.now(), data });
  return data;
}
const cleanHandle = h => String(h || '').trim().replace(/^.*\/citizens\//i, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);

// ---------------------------------------------------------------- helpers
function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const redirect = (res, to, cookies = []) => { res.writeHead(302, { Location: to, 'Set-Cookie': cookies }); res.end(); };

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
function cookie(name, value, { maxAge, secure }) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}${maxAge != null ? `; Max-Age=${maxAge}` : ''}`;
}
const sha256 = s => createHash('sha256').update(s).digest('hex');
const isSecure = req => (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https' || (process.env.PUBLIC_URL || '').startsWith('https://');
const publicUrl = req => (process.env.PUBLIC_URL || `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`).replace(/\/$/, '');

async function readJson(req, limit = 300 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw httpError(413, 'Request too large');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw httpError(400, 'Invalid JSON'); }
}

const authEnabled = () => db.dbEnabled() && !!process.env.DISCORD_CLIENT_ID && !!process.env.DISCORD_CLIENT_SECRET;

async function currentUser(req) {
  if (!db.dbEnabled()) return null;
  const token = cookies(req)[SESSION_COOKIE];
  if (!token || token.length < 20) return null;
  return db.userForSession(sha256(token));
}
const isAdmin = u => !!u && (process.env.ADMIN_DISCORD_IDS || '').split(',').map(x => x.trim()).filter(Boolean).includes(u.discord_id);
const publicUser = u => u && ({
  admin: isAdmin(u),
  id: String(u.id), name: u.name, avatar: u.avatar,
  rsiHandle: u.rsi_handle, rsiCard: u.rsi_card, rsiPending: u.rsi_pending, rsiCode: u.rsi_code, publicFleet: u.public_fleet,
});

// Light per-user throttle for routes that call RSI.
const lastCall = new Map();
function throttle(key, ms) {
  const t = lastCall.get(key) || 0;
  if (Date.now() - t < ms) throw httpError(429, `Please wait ${Math.ceil((ms - (Date.now() - t)) / 1000)} seconds and try again.`);
  lastCall.set(key, Date.now());
}

// ---------------------------------------------------------------- Discord OAuth
function startDiscord(req, res) {
  if (!authEnabled()) throw httpError(503, 'Sign-in is not set up on this server.');
  const state = randomBytes(18).toString('base64url');
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID, response_type: 'code', scope: 'identify', prompt: 'none',
    redirect_uri: `${publicUrl(req)}/auth/discord/callback`, state,
  });
  redirect(res, `${DISCORD}/oauth2/authorize?${params}`, [cookie(STATE_COOKIE, state, { maxAge: 600, secure: isSecure(req) })]);
}

async function discordCallback(req, res, url) {
  if (!authEnabled()) throw httpError(503, 'Sign-in is not set up on this server.');
  const expected = cookies(req)[STATE_COOKIE] || '';
  const got = url.searchParams.get('state') || '';
  const clearState = cookie(STATE_COOKIE, '', { maxAge: 0, secure: isSecure(req) });
  if (url.searchParams.get('error')) return redirect(res, '/#/account?signin=cancelled', [clearState]);
  if (!expected || expected.length !== got.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(got))) {
    return redirect(res, '/#/account?signin=failed', [clearState]);
  }
  const tokenRes = await fetch(`${DISCORD}/api/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID, client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code', code: url.searchParams.get('code') || '', redirect_uri: `${publicUrl(req)}/auth/discord/callback`,
    }),
  });
  if (!tokenRes.ok) return redirect(res, '/#/account?signin=failed', [clearState]);
  const { access_token: accessToken } = await tokenRes.json();
  const meRes = await fetch(`${DISCORD}/api/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!meRes.ok) return redirect(res, '/#/account?signin=failed', [clearState]);
  const me = await meRes.json();
  const user = await db.upsertDiscordUser({
    discordId: me.id,
    name: me.global_name || me.username,
    avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null,
  });
  const token = randomBytes(32).toString('base64url');
  await db.createSession(user.id, sha256(token), 30);
  redirect(res, '/#/account?signin=ok', [clearState, cookie(SESSION_COOKIE, token, { maxAge: 30 * 86400, secure: isSecure(req) })]);
}

// ---------------------------------------------------------------- API
async function api(req, res, url) {
  const p = url.pathname;
  const method = req.method;

  if (p === '/api/health') return send(res, 200, { ok: true, accounts: authEnabled() });

  const cm = p.match(/^\/api\/citizen\/([A-Za-z0-9_-]{2,60})$/);
  if (cm && method === 'GET') {
    const data = await citizen(cm[1]);
    if (!data) return send(res, 404, { error: `No citizen named "${cm[1]}" was found on RSI.` });
    const { bio, ...pub } = data; void bio;
    return send(res, 200, pub, undefined, { 'Cache-Control': 'public, max-age=600' });
  }

  const pm = p.match(/^\/api\/u\/([A-Za-z0-9_-]{2,60})$/);
  if (pm && method === 'GET') {
    if (!db.dbEnabled()) throw httpError(404, 'Public fleets are not available on this server.');
    const prof = await db.publicProfile(pm[1]);
    if (!prof) return send(res, 404, { error: 'This citizen has no public fleet here.' });
    return send(res, 200, prof, undefined, { 'Cache-Control': 'public, max-age=60' });
  }

  if (p === '/api/suggestions' && method === 'GET') {
    if (!db.dbEnabled()) throw httpError(503, 'The suggestion board needs accounts to be switched on.');
    const viewer = await currentUser(req);
    const list = await db.listSuggestions(viewer?.id, { sort: url.searchParams.get('sort') || 'top', status: url.searchParams.get('status') || '' });
    return send(res, 200, { suggestions: list, statuses: db.SUGGESTION_STATUSES, categories: db.SUGGESTION_CATEGORIES }, undefined, { 'Cache-Control': 'no-store' });
  }

  if (p === '/api/me' && method === 'GET') {
    const u = await currentUser(req);
    return send(res, 200, { enabled: authEnabled(), user: publicUser(u) }, undefined, { 'Cache-Control': 'no-store' });
  }

  // Everything below needs a signed-in user. Writes must come from our own pages.
  if (method !== 'GET' && req.headers['x-verse-atlas'] !== '1') throw httpError(403, 'Missing request header');
  const user = await currentUser(req);
  if (!user) throw httpError(401, 'Sign in first.');

  if (p === '/api/state' && method === 'GET') return send(res, 200, await db.getState(user.id), undefined, { 'Cache-Control': 'no-store' });
  const sm = p.match(/^\/api\/state\/(\w+)$/);
  if (sm && method === 'PUT') {
    const body = await readJson(req);
    await db.putState(user.id, sm[1], body.value);
    return send(res, 200, { ok: true });
  }

  if (p === '/api/rsi/claim' && method === 'POST') {
    const handle = cleanHandle((await readJson(req)).handle);
    if (handle.length < 2) throw httpError(400, 'Enter your RSI handle.');
    throttle(`claim:${user.id}`, 3000);
    const card = await citizen(handle);
    if (!card) throw httpError(404, `No citizen named "${handle}" was found on RSI.`);
    const code = `VA-${randomBytes(4).toString('hex').toUpperCase()}`;
    await db.setRsiClaim(user.id, card.handle, code);
    return send(res, 200, { handle: card.handle, code });
  }
  if (p === '/api/rsi/verify' && method === 'POST') {
    if (!user.rsi_pending || !user.rsi_code) throw httpError(400, 'Start by entering your RSI handle.');
    throttle(`verify:${user.id}`, 10000);
    const card = await citizen(user.rsi_pending, { fresh: true });
    if (!card) throw httpError(404, 'That RSI profile could not be found.');
    if (!(card.bio || '').includes(user.rsi_code)) {
      throw httpError(409, `We couldn't find ${user.rsi_code} in the bio of ${card.handle}. Save your RSI profile, wait a minute and try again.`);
    }
    const { bio, ...pub } = card; void bio;
    await db.setRsiVerified(user.id, card.handle, pub);
    return send(res, 200, { ok: true, card: pub });
  }
  if (p === '/api/rsi/unlink' && method === 'POST') { await db.unlinkRsi(user.id); return send(res, 200, { ok: true }); }

  if (p === '/api/profile' && method === 'POST') {
    const body = await readJson(req);
    if ('publicFleet' in body) {
      if (body.publicFleet && !user.rsi_handle) throw httpError(400, 'Verify your RSI handle first, so your fleet page has an address.');
      await db.setPublicFleet(user.id, body.publicFleet);
    }
    return send(res, 200, { ok: true });
  }

  if (p === '/api/suggestions' && method === 'POST') {
    const b = await readJson(req, 20 * 1024);
    const title = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    const body = String(b.body || '').trim().slice(0, 4000);
    const category = db.SUGGESTION_CATEGORIES.includes(b.category) ? b.category : 'Other';
    if (title.length < 6) throw httpError(400, 'Give your suggestion a title of at least 6 characters.');
    if (!isAdmin(user) && await db.countRecentSuggestions(user.id) >= 5) throw httpError(429, 'You can post 5 suggestions a day. Vote on others in the meantime!');
    return send(res, 200, { id: await db.createSuggestion(user.id, { title, body, category }) });
  }
  const vm = p.match(/^\/api\/suggestions\/(\d+)\/(vote|status)$/);
  if (vm && method === 'POST') {
    const b = await readJson(req, 8 * 1024);
    if (vm[2] === 'vote') { await db.voteSuggestion(vm[1], user.id, !!b.on); return send(res, 200, { ok: true }); }
    if (!isAdmin(user)) throw httpError(403, 'Only admins can change a suggestion\'s status.');
    if (!db.SUGGESTION_STATUSES.includes(b.status)) throw httpError(400, 'Unknown status');
    await db.updateSuggestionStatus(vm[1], b.status, String(b.note || '').trim().slice(0, 1000));
    return send(res, 200, { ok: true });
  }
  const dm = p.match(/^\/api\/suggestions\/(\d+)$/);
  if (dm && method === 'DELETE') {
    const owner = await db.suggestionOwner(dm[1]);
    if (owner === null) throw httpError(404, 'Suggestion not found');
    if (owner !== String(user.id) && !isAdmin(user)) throw httpError(403, 'You can only delete your own suggestions.');
    await db.deleteSuggestion(dm[1]);
    return send(res, 200, { ok: true });
  }

  if (p === '/api/export' && method === 'GET') {
    return send(res, 200, JSON.stringify(await db.exportUser(user.id), null, 2), 'application/json; charset=utf-8', { 'Content-Disposition': 'attachment; filename="verse-atlas-data.json"', 'Cache-Control': 'no-store' });
  }
  if (p === '/api/delete-account' && method === 'POST') {
    await db.deleteUser(user.id);
    return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0, secure: isSecure(req) }) });
  }
  throw httpError(404, 'Unknown API route');
}

// ---------------------------------------------------------------- server
export const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/auth/discord' && req.method === 'GET') return startDiscord(req, res);
    if (url.pathname === '/auth/discord/callback' && req.method === 'GET') return await discordCallback(req, res, url);
    if (url.pathname === '/auth/logout' && req.method === 'POST') {
      const token = cookies(req)[SESSION_COOKIE];
      if (token && db.dbEnabled()) await db.deleteSession(sha256(token));
      return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': cookie(SESSION_COOKIE, '', { maxAge: 0, secure: isSecure(req) }) });
    }
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);

    // Static files.
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');
    try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
    catch { file = path.join(ROOT, 'index.html'); }
    const body = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const caching = ext === '.json' ? 'public, max-age=300' : ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    send(res, 200, body, TYPES[ext] || 'application/octet-stream', { 'Cache-Control': caching });
  } catch (e) {
    const status = e.status || 502;
    if (status >= 500) console.error(e);
    send(res, status, { error: e.message || 'Something went wrong' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const accounts = await db.initDb().catch(e => { console.error('Database unavailable, accounts disabled:', e.message); return false; });
  server.listen(PORT, () => {
    console.log(`Verse Atlas running at http://localhost:${PORT}`);
    console.log(accounts ? (authEnabled() ? 'Accounts: on (Discord sign-in)' : 'Accounts: database ready, set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET to enable sign-in') : 'Accounts: off (no DATABASE_URL)');
  });
}
