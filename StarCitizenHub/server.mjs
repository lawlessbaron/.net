#!/usr/bin/env node
// Zero-dependency web server for Star Citizen Hub.
//
//   node server.mjs              → http://localhost:8080
//   PORT=3000 node server.mjs
//
// Serves the static site in ./site and adds a few API routes that a browser
// cannot call directly because of CORS:
//   GET /api/citizen/:handle   public RSI citizen profile (name, avatar, org, enlisted…)
//   GET /api/health

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.env.PORT) || 8080;
const RSI = 'https://robertsspaceindustries.com';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

// Small in-memory cache so repeated lookups don't hammer RSI.
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
    org = {
      sid: sid || null,
      name: name ? decode(name) : null,
      logo: abs(logo),
      rank: field(b, 'Organization rank'),
      url: sid ? `${RSI}/orgs/${sid}` : null,
    };
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

async function citizen(handle) {
  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const res = await fetch(`${RSI}/en/citizens/${encodeURIComponent(handle)}`, {
    headers: { 'User-Agent': 'StarCitizenHub (fan site; citizen lookup)', Accept: 'text/html' },
    redirect: 'follow',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RSI responded ${res.status}`);
  const data = parseCitizen(await res.text(), handle);
  cache.set(key, { at: Date.now(), data });
  return data;
}

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true });

    const m = url.pathname.match(/^\/api\/citizen\/([A-Za-z0-9_-]{2,60})$/);
    if (m) {
      const data = await citizen(m[1]);
      if (!data) return send(res, 404, { error: `No citizen named "${m[1]}" was found on RSI.` });
      return send(res, 200, data, undefined, { 'Cache-Control': 'public, max-age=600' });
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Unknown API route' });

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
    send(res, 502, { error: e.message || 'Something went wrong' });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Star Citizen Hub running at http://localhost:${PORT}`));
}
