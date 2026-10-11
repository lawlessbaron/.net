// App shell: navigation, hash router, global search, theme.
import { html, render, icon, load, store, esc, fmt, norm, errorBox, timeAgo } from './lib.js';
import { REFERRAL } from './content/site.js';
import { initAccount, onSession, session, signIn } from './account.js';

const NAV = [
  ['Start here', [
    ['#/', 'home', 'Home'],
    ['#/guide', 'book', 'New player guide'],
  ]],
  ['Find work', [
    ['#/missions', 'target', 'Missions', 'missions'],
    ['#/factions', 'users', 'Mission givers & rep', 'factions'],
  ]],
  ['Gear up', [
    ['#/ships', 'ship', 'Ships & vehicles', 'ships'],
    ['#/paints', 'grid', 'Paints & liveries', 'paints'],
    ['#/pledge', 'star', 'Pledge store prices'],
    ['#/items', 'crosshair', 'Weapons, armor & items', 'items'],
    ['#/locations', 'map', 'Locations & shops', 'locations'],
  ]],
  ['You', [
    ['#/fleet', 'hangar', 'My fleet'],
    ['#/studio', 'play', 'Share studio'],
  ]],
  ['Community', [
    ['#/events', 'calendar', 'Events & sales'],
    ['#/news', 'radio', 'News & leaks'],
    ['#/suggestions', 'bolt', 'Suggestions'],
  ]],
];

const ROUTES = [
  [/^\/?$/, () => import('./pages/home.js')],
  [/^\/guide(?:\/([\w-]+))?$/, () => import('./pages/guide.js')],
  [/^\/missions(?:\/([\w-]+))?$/, () => import('./pages/missions.js')],
  [/^\/factions(?:\/([\w-]+))?$/, () => import('./pages/factions.js')],
  [/^\/ships(?:\/([\w.-]+))?$/, () => import('./pages/ships.js')],
  [/^\/compare$/, () => import('./pages/ships.js'), 'compare'],
  [/^\/items(?:\/([\w-]+))?$/, () => import('./pages/items.js')],
  [/^\/locations(?:\/([\w-]+))?$/, () => import('./pages/locations.js')],
  [/^\/pledge$/, () => import('./pages/pledge.js')],
  [/^\/paints$/, () => import('./pages/paints.js')],
  [/^\/events$/, () => import('./pages/events.js')],
  [/^\/fleet$/, () => import('./pages/fleet.js')],
  [/^\/account$/, () => import('./pages/account.js')],
  [/^\/suggestions$/, () => import('./pages/suggestions.js')],
  [/^\/studio$/, () => import('./pages/studio.js')],
  [/^\/u\/([A-Za-z0-9_-]+)$/, () => import('./pages/fleet.js'), 'public'],
  [/^\/news$/, () => import('./pages/news.js')],
];

const main = document.getElementById('main');
const side = document.getElementById('side');
let meta = {};

// ---------------------------------------------------------------- theme
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t !== 'light';
  render(document.getElementById('theme-btn'), icon(dark ? 'sun' : 'moon'));
}
applyTheme(store.get('theme'));
document.getElementById('theme-btn').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  store.set('theme', next);
  applyTheme(next);
});

// ---------------------------------------------------------------- nav
function renderNav() {
  const counts = meta.counts || {};
  render(document.getElementById('nav'), NAV.map(([label, links]) => html`
    <div class="nav-group">
      <div class="nav-label">${label}</div>
      ${links.map(([href, ic, text, countKey]) => html`
        <a class="nav-link" href="${href}" data-href="${href}">${icon(ic)}<span>${text}</span>${countKey && counts[countKey] ? html`<span class="count">${fmt(counts[countKey])}</span>` : ''}</a>`)}
    </div>`));
  const ver = meta.gameVersion ? `LIVE ${meta.gameVersion}` : 'LIVE';
  document.getElementById('version-chip').textContent = ver;
  render(document.getElementById('side-foot'), html`
    <a class="side-ref" href="${REFERRAL.url}" target="_blank" rel="noopener noreferrer"><span>New player? Get ${REFERRAL.bonus}</span><b class="mono">${REFERRAL.code}</b></a>
    <span>Data for Star Citizen <b class="mono">${meta.gameVersion || 'LIVE'}</b></span>
    <span>Updated ${meta.generatedAt ? timeAgo(meta.generatedAt) : '—'}</span>`);
  render(document.getElementById('foot'), html`
    <span>Verse Atlas is an unofficial fan site and is not endorsed by Cloud Imperium Games. Star Citizen® is a registered trademark of Cloud Imperium Rights LLC.</span>
    <span>Game data from ${(meta.sources || []).map((s, i) => html`${i ? ', ' : ''}<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>`)}. Prices and spawns change every patch, so double-check in game.</span>`);
}
function markActive(path) {
  const top = '#/' + (path.split('/')[1] || '');
  document.querySelectorAll('.nav-link').forEach(a => {
    const h = a.dataset.href;
    a.classList.toggle('active', h === top || (top === '#/compare' && h === '#/ships'));
    if (a.classList.contains('active')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// mobile menu
const menuBtn = document.getElementById('menu-btn');
render(menuBtn, icon('menu'));
function setMenu(open) {
  side.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  document.querySelector('.scrim')?.remove();
  if (open) {
    const s = document.createElement('div');
    s.className = 'scrim';
    s.addEventListener('click', () => setMenu(false));
    document.body.append(s);
  }
}
menuBtn.addEventListener('click', () => setMenu(!side.classList.contains('open')));

// ---------------------------------------------------------------- router
let renderToken = 0;
async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(query));
  setMenu(false);
  markActive(path);
  const token = ++renderToken;
  for (const [re, loader, variant] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    try {
      const mod = await loader();
      if (token !== renderToken) return;
      main.classList.remove('enter'); void main.offsetWidth; main.classList.add('enter');
      await mod.default(main, { id: m[1] ? decodeURIComponent(m[1]) : null, params, variant, meta, isCurrent: () => token === renderToken });
      if (token === renderToken && !params.keepScroll) window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      if (token === renderToken) render(main, errorBox(e));
    }
    return;
  }
  render(main, html`<div class="empty"><h2>Page not found</h2><p>That link doesn't lead anywhere. Try the search bar or <a href="#/">go home</a>.</p></div>`);
}
window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- global search
const palette = document.getElementById('palette');
const pInput = document.getElementById('palette-input');
const pResults = document.getElementById('palette-results');
let searchIndex = null;
let sel = 0;
let hits = [];

async function buildIndex() {
  if (searchIndex) return searchIndex;
  const [missions, ships, items, locations, factions] = await Promise.all([
    load('missions'), load('ships'), load('items'), load('locations'), load('factions'),
  ]);
  const guide = await import('./content/guide.js').catch(() => ({ guideChapters: [] }));
  searchIndex = [
    ...(guide.guideChapters || []).map(c => ({ k: 'Guide', t: c.title, x: `${c.minutes || ''} min`, h: `#/guide/${c.id}`, s: norm(`${c.title} ${c.summary} ${c.steps.map(s => s.title).join(' ')}`), w: 3 })),
    ...ships.map(s => ({ k: s.ground ? 'Vehicle' : 'Ship', t: s.name, x: s.maker || '', h: `#/ships/${s.id}`, s: norm(`${s.name} ${s.fullName} ${s.maker} ${s.role} ${s.career}`), w: 2 })),
    ...factions.map(f => ({ k: 'Faction', t: f.name, x: `${f.missions || 0} missions`, h: `#/factions/${f.id}`, s: norm(`${f.name} ${(f.givers || []).join(' ')}`), w: 2 })),
    ...locations.map(l => ({ k: 'Place', t: l.name, x: [l.moon || l.planet || l.orbit, l.system].filter(Boolean).join(' · '), h: `#/locations/${l.id}`, s: norm(`${l.name} ${l.planet} ${l.moon} ${l.system}`), w: 2 })),
    ...items.map(i => ({ k: 'Item', t: i.name, x: i.cat, h: `#/items/${i.id}`, s: norm(`${i.name} ${i.maker} ${i.cat} ${i.stats?.kind || ''}`), w: 1 })),
    ...missions.map(m => ({ k: 'Mission', t: m.title, x: m.giver || m.category || '', h: `#/missions/${m.id}`, s: norm(`${m.title} ${m.giver} ${m.category} ${m.type}`), w: 1 })),
  ];
  return searchIndex;
}

function scoreHit(e, q, words) {
  const t = norm(e.t);
  let sc = 0;
  if (t === q) sc += 100;
  else if (t.startsWith(q)) sc += 60;
  else if (t.includes(q)) sc += 35;
  for (const w of words) if (!e.s.includes(w)) return 0;
  return sc + 10 + e.w * 4;
}

async function runSearch() {
  const q = norm(pInput.value.trim());
  if (!q) {
    render(pResults, html`<div class="pr"><span class="kind">Tip</span><span class="t muted">Try "cutlass", "P4-AR", "Headhunters", "Lorville", or "medpen"</span><span></span></div>`);
    hits = [];
    return;
  }
  let idx;
  try { idx = await buildIndex(); } catch (e) { render(pResults, html`<div class="pr"><span class="kind">Error</span><span class="t">${e.message}</span></div>`); return; }
  const words = q.split(/\s+/).filter(Boolean);
  hits = idx.map(e => [scoreHit(e, q, words), e]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map(([, e]) => e);
  sel = 0;
  render(pResults, hits.length ? hits.map((e, i) => html`
    <a class="pr ${i === sel ? 'sel' : ''}" href="${e.h}" data-i="${i}"><span class="kind">${e.k}</span><span class="t">${e.t}</span><span class="x">${e.x}</span></a>`)
    : html`<div class="pr"><span class="kind">No match</span><span class="t muted">Nothing found for "${pInput.value}"</span><span></span></div>`);
}
function openPalette() {
  palette.hidden = false;
  pInput.value = '';
  runSearch();
  setTimeout(() => pInput.focus(), 10);
}
function closePalette() { palette.hidden = true; }
document.getElementById('search-trigger').addEventListener('click', openPalette);
render(document.querySelector('.st-icon'), icon('search'));
palette.addEventListener('click', e => { if (e.target === palette) closePalette(); if (e.target.closest('.pr[href]')) closePalette(); });
let searchTimer;
pInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 90); });
pInput.addEventListener('keydown', e => {
  const items = pResults.querySelectorAll('.pr[href]');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.classList.toggle('sel', i === sel));
    items[sel].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && items[sel]) {
    location.hash = items[sel].getAttribute('href');
    closePalette();
  }
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
  else if (e.key === '/' && palette.hidden && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); openPalette(); }
  else if (e.key === 'Escape' && !palette.hidden) closePalette();
});

// ---------------------------------------------------------------- starfield backdrop
function starfield() {
  const c = document.createElement('canvas');
  c.id = 'stars'; c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  const ctx = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [], W = 0, H = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const seed = () => {
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr;
    const n = Math.round((W * H) / 5200);
    stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() ** 3 * 1.6 + 0.25, p: Math.random() * 6.3, s: 0.4 + Math.random() * 1.2, z: Math.random() }));
  };
  seed();
  addEventListener('resize', seed);
  const draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const col = getComputedStyle(document.documentElement).getPropertyValue('--star').trim() || '#fff';
    const off = reduce ? 0 : scrollY * 0.04;
    ctx.fillStyle = col;
    for (const st of stars) {
      const a = reduce ? 0.7 : 0.45 + 0.55 * Math.sin(st.p + t * 0.0012 * st.s);
      ctx.globalAlpha = a * (0.35 + st.z * 0.65);
      const y = ((st.y - off * (0.3 + st.z)) % H + H) % H;
      ctx.beginPath(); ctx.arc(st.x, y, st.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
starfield();

// ---------------------------------------------------------------- account button
function renderAccountButton() {
  const host = document.getElementById('account-slot');
  if (!host) return;
  if (!session.enabled) { render(host, ''); return; }
  render(host, session.user
    ? html`<a class="acct-btn" href="#/account" title="Your account">${session.user.avatar ? html`<img src="${session.user.avatar}" alt="" referrerpolicy="no-referrer">` : html`<span>${session.user.name.slice(0, 1)}</span>`}<b>${session.user.rsiHandle || session.user.name}</b></a>`
    : html`<button class="btn btn-sm discord-btn" type="button" id="signin-top">${icon('users')} Sign in</button>`);
  document.getElementById('signin-top')?.addEventListener('click', signIn);
}
let firstSession = true;
onSession(() => {
  renderAccountButton();
  // Once, after sign-in data has synced, re-render pages that show saved data.
  if (firstSession && session.user && /^#\/(fleet|account|factions|guide|missions\/|suggestions|studio)/.test(location.hash)) route();
  firstSession = false;
});

// ---------------------------------------------------------------- boot
(async () => {
  try { meta = await load('meta'); } catch { meta = {}; }
  renderNav();
  route();
  initAccount();
})();

export { esc };
