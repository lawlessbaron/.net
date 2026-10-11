// Shared helpers: escaping, formatting, data loading, storage, small UI bits.

export const esc = v => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Tagged template that escapes interpolations unless they are raw() or arrays of raw.
const RAW = Symbol('raw');
export const raw = s => ({ [RAW]: true, s: String(s ?? '') });
export function html(strings, ...vals) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < vals.length) out += flatten(vals[i]);
  });
  return raw(out);
}
function flatten(v) {
  if (v === null || v === undefined || v === false) return '';
  if (Array.isArray(v)) return v.map(flatten).join('');
  if (typeof v === 'object' && v[RAW]) return v.s;
  return esc(v);
}
export const render = (el, tpl) => { el.innerHTML = flatten(tpl); };

const nf = new Intl.NumberFormat('en-US');
export const fmt = (n, d = 0) => (n === null || n === undefined || Number.isNaN(+n) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(+n));
export const auec = n => (n ? `${nf.format(Math.round(n))} aUEC` : '—');
export const shortAuec = n => {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '')}k`;
  return nf.format(n);
};
export const usd = n => (n ? `$${nf.format(n)}` : '—');
export const plural = (n, one, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
export const slug = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
export const timeAgo = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (Number.isNaN(s)) return '';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} days ago`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
export const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// localStorage that never throws (private windows, blocked storage, previews).
// Listeners hear about every change so signed-in users can sync to their account.
const storeListeners = new Set();
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(`sch:${key}`); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value, { silent = false } = {}) {
    let ok = true;
    try { localStorage.setItem(`sch:${key}`, JSON.stringify(value)); } catch { ok = false; }
    if (!silent) storeListeners.forEach(fn => fn(key, value));
    return ok;
  },
  subscribe(fn) { storeListeners.add(fn); return () => storeListeners.delete(fn); },
};

// Data loading with a single in-flight request per file.
const cache = new Map();
export function load(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`data/${name}.json`).then(r => {
      if (!r.ok) throw new Error(`Could not load ${name} data (${r.status}). Run "npm run data" to build it.`);
      return r.json();
    }).catch(e => { cache.delete(name); throw e; }));
  }
  return cache.get(name);
}

let indexes;
// Lookup tables shared by several pages.
export async function lookups() {
  if (indexes) return indexes;
  const [ships, items, locations, terminals, factions] = await Promise.all([
    load('ships'), load('items'), load('locations'), load('terminals'), load('factions'),
  ]);
  indexes = {
    ships, items, locations, terminals, factions,
    shipById: new Map(ships.map(s => [s.id, s])),
    itemById: new Map(items.map(i => [i.id, i])),
    placeById: new Map(locations.map(l => [l.id, l])),
    terminalById: new Map(terminals.map(t => [t.id, t])),
    factionById: new Map(factions.map(f => [f.id, f])),
    factionByName: new Map(factions.map(f => [f.name, f])),
  };
  return indexes;
}

// Placeholder art for ships/items whose image is missing or blocked.
export function placeholderArt(label, kind = 'ship') {
  const initials = String(label || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
  return html`<div class="ph ph-${kind}" aria-hidden="true"><span>${initials}</span></div>`;
}
export function img(src, alt, kind = 'ship') {
  if (!src) return placeholderArt(alt, kind);
  return html`<img src="${src}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" data-fallback="${kind}">`;
}
// Swap broken images for placeholder art (one global listener).
document.addEventListener('error', e => {
  const el = e.target;
  if (el.tagName === 'IMG' && el.dataset.fallback) {
    const wrap = document.createElement('div');
    wrap.innerHTML = flatten(placeholderArt(el.alt, el.dataset.fallback));
    el.replaceWith(wrap.firstElementChild);
  }
}, true);

export function toast(msg, kind = 'ok') {
  let host = document.getElementById('toasts');
  if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('role', 'status'); document.body.append(host); }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  host.append(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

export async function copy(text, okMsg = 'Copied') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); return true; }
  catch { toast('Copy blocked by the browser. Select the text and copy it manually.', 'warn'); return false; }
}

// Small inline icons (stroke-based, inherit currentColor).
const P = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7',
  target: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  ship: 'M12 2l3 7 6 3-6 3-3 7-3-7-6-3 6-3z',
  crosshair: 'M12 2v4M12 18v4M2 12h4M18 12h4M12 12h.01M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  hangar: 'M3 21V9l9-6 9 6v12M7 21v-6h10v6M3 21h18',
  radio: 'M4 12a8 8 0 0 1 16 0M7.5 12a4.5 4.5 0 0 1 9 0M12 12v9',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  check: 'M4 12l5 5L20 6',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 18l-6-6 6-6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  play: 'M7 4l13 8-13 8z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  scale: 'M3 17h18M6 17V9M10 17V5M14 17v-5M18 17V8',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
};
export const icon = (name, cls = '') => raw(`<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.info}"/></svg>`);

export const ext = (href, label) => html`<a href="${href}" target="_blank" rel="noopener noreferrer" class="ext">${label}${icon('ext', 'i-sm')}</a>`;

// Renders a page-level error state.
export const errorBox = (e) => html`<div class="empty"><h2>Couldn't load this section</h2><p>${e?.message || e}</p></div>`;

// Simple paginated list helper: returns visible slice + whether there's more.
export function paginate(list, count) {
  return { shown: list.slice(0, count), more: Math.max(0, list.length - count) };
}

export const systemClass = s => `sys-${slug(s || 'unknown')}`;

// Referral sign-up card (new players get a starting bonus when they enlist with a code).
import { REFERRAL } from './content/site.js';
export function referralCard(compact = false) {
  return html`<div class="referral ${compact ? 'referral-compact' : ''}">
    <div class="referral-copy">
      <span class="eyebrow">New to Star Citizen?</span>
      <${compact ? 'b' : 'h3'}>Sign up with a referral code and get ${REFERRAL.bonus} free</${compact ? 'b' : 'h3'}>
      ${compact ? '' : html`<p>Creating your RSI account with this code gives you a one-time bonus of in-game credits to spend on your first gear and ship upgrades. The code only works when entered at sign-up.</p>`}
    </div>
    <div class="referral-actions">
      <button type="button" class="referral-code" data-copy="${REFERRAL.code}" title="Copy referral code"><span class="mono">${REFERRAL.code}</span>${icon('link', 'i-sm')}</button>
      <a class="btn btn-primary ${compact ? 'btn-sm' : ''}" href="${REFERRAL.url}" target="_blank" rel="noopener noreferrer">Enlist with this code ${icon('ext', 'i-sm')}</a>
    </div>
  </div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (b) copy(b.dataset.copy, `Copied ${b.dataset.copy}`);
});
