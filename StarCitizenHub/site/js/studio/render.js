// Share-card renderer: draws branded cards on a canvas at real social-media sizes.
// Every scene is a function of t (0→1) so the same code makes the still image (t = 1)
// and the animated video (t sweeping from 0 to 1).
import { REFERRAL } from '../content/site.js';

export const FORMATS = {
  square: { w: 1080, h: 1080, label: 'Square 1080×1080 (Instagram, Discord)' },
  landscape: { w: 1200, h: 675, label: 'Landscape 1200×675 (X / Twitter, Reddit)' },
  story: { w: 1080, h: 1920, label: 'Story 1080×1920 (TikTok, Reels, Shorts)' },
};

export const PALETTE = {
  bg: '#0b1116', bg2: '#111c25', panel: '#16222c', line: '#2a3a46', fg: '#e3eaef', muted: '#8a9caa',
  accent: '#f0a33a', signal: '#63c7bf', good: '#6fc275', bad: '#ec6a58', nyx: '#b48ae8', stanton: '#6aa8e8', warn: '#e8b84d', pyro: '#f07c4a',
};
export const CAREER = { Combat: '#ec6a58', Transporter: '#6aa8e8', Industrial: '#e8b84d', Exploration: '#b48ae8', Support: '#6fc275', Competition: '#f07c4a', 'Multi-Role': '#f0a33a', Ground: '#63c7bf' };

const DISPLAY = '"Chakra Petch", "Segoe UI", sans-serif';
const BODY = '"Barlow", "Segoe UI", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// ---------------------------------------------------------------- images
let proxyOk = null;
async function canProxy() {
  if (proxyOk !== null) return proxyOk;
  try { proxyOk = (await fetch('/api/health')).ok; } catch { proxyOk = false; }
  return proxyOk;
}
const imgCache = new Map();
export function loadImage(url) {
  if (!url) return Promise.resolve(null);
  if (imgCache.has(url)) return imgCache.get(url);
  const p = (async () => {
    const tryLoad = src => new Promise(res => {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
    if (url.startsWith('data:') || url.startsWith('/')) return tryLoad(url);
    if (await canProxy()) { const im = await tryLoad(`/api/img?u=${encodeURIComponent(url)}`); if (im) return im; }
    return tryLoad(url); // works for hosts that send CORS headers (e.g. FleetYards)
  })();
  imgCache.set(url, p);
  return p;
}

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
// Progress of a sub-animation that runs between start and end (fractions of t).
const seg = (t, start, end) => ease((t - start) / (end - start));
const nf = n => new Intl.NumberFormat('en-US').format(Math.round(n));
export const shortNum = n => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : nf(n));

function font(ctx, weight, size, family) { ctx.font = `${weight} ${Math.round(size)}px ${family}`; }
function text(ctx, s, x, y, { size = 30, weight = 500, family = BODY, color = PALETTE.fg, align = 'left', base = 'alphabetic', max, spacing } = {}) {
  font(ctx, weight, size, family);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing) { try { ctx.letterSpacing = `${spacing}px`; } catch { /* older browsers */ } }
  ctx.fillText(s, x, y, max);
  if (spacing) { try { ctx.letterSpacing = '0px'; } catch { /* ignore */ } }
}
function wrap(ctx, s, maxW, size, weight = 500, family = BODY, maxLines = 4) {
  font(ctx, weight, size, family);
  const words = String(s || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…'); }
  return lines;
}
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

// Seeded stars so every frame of a video uses the same sky.
function stars(ctx, W, H, t, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const n = Math.round((W * H) / 3500);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, r = rnd() ** 3 * 2.2 + 0.4, ph = rnd() * 6.28;
    ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(ph + t * 9));
    ctx.fillStyle = '#d6e6ff';
    ctx.beginPath(); ctx.arc(x - t * 30 * r, y, r, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function background(ctx, W, H, t, accent) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, PALETTE.bg2); g.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r1 = ctx.createRadialGradient(W * 0.85, -H * 0.05, 0, W * 0.85, -H * 0.05, Math.max(W, H) * 0.75);
  r1.addColorStop(0, accent + '40'); r1.addColorStop(1, accent + '00');
  ctx.fillStyle = r1; ctx.fillRect(0, 0, W, H);
  const r2 = ctx.createRadialGradient(0, H, 0, 0, H, Math.max(W, H) * 0.6);
  r2.addColorStop(0, PALETTE.signal + '22'); r2.addColorStop(1, PALETTE.signal + '00');
  ctx.fillStyle = r2; ctx.fillRect(0, 0, W, H);
  stars(ctx, W, H, t);
  // fine grid
  ctx.strokeStyle = PALETTE.line; ctx.globalAlpha = 0.18; ctx.lineWidth = 1;
  const step = Math.round(Math.min(W, H) / 18);
  ctx.beginPath();
  for (let x = 0; x < W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 0; y < H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke(); ctx.globalAlpha = 1;
}

function brackets(ctx, W, H, u, accent, t) {
  const L = 46 * u * seg(t, 0, 0.25), m = 26 * u;
  ctx.strokeStyle = accent; ctx.lineWidth = 4 * u; ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
  ctx.moveTo(W - m - L, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - L);
  ctx.stroke();
}

function brandMark(ctx, x, y, s, accent) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 32, s / 32);
  ctx.strokeStyle = accent; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(16, 16, 14, 0, 6.283); ctx.stroke();
  ctx.fillStyle = accent; ctx.beginPath();
  [[16, 5], [19.5, 13.5], [28, 16], [19.5, 19.5], [16, 27], [12.5, 19.5], [4, 16], [12.5, 13.5]].forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function footer(ctx, W, H, u, opts) {
  const y = H - 58 * u;
  ctx.strokeStyle = PALETTE.line; ctx.lineWidth = 1.5 * u;
  ctx.beginPath(); ctx.moveTo(56 * u, y - 34 * u); ctx.lineTo(W - 56 * u, y - 34 * u); ctx.stroke();
  brandMark(ctx, 56 * u, y - 20 * u, 34 * u, opts.accent);
  text(ctx, 'VERSE ATLAS', 100 * u, y + 4 * u, { size: 24 * u, weight: 700, family: DISPLAY, spacing: 3 * u });
  text(ctx, opts.site || 'Star Citizen field guide', 100 * u, y + 28 * u, { size: 17 * u, color: PALETTE.muted });
  if (opts.referral !== false) {
    text(ctx, 'NEW PLAYER? +' + REFERRAL.bonus, W - 56 * u, y - 2 * u, { size: 16 * u, align: 'right', color: PALETTE.muted, family: DISPLAY, weight: 600, spacing: 1.5 * u });
    text(ctx, REFERRAL.code, W - 56 * u, y + 26 * u, { size: 26 * u, align: 'right', color: opts.accent, family: MONO, weight: 500 });
  }
}

function header(ctx, W, u, t, eyebrow, title, accent, { y = 92, size = 64, maxW } = {}) {
  const a = seg(t, 0.02, 0.22);
  ctx.globalAlpha = a;
  text(ctx, eyebrow.toUpperCase(), 56 * u, y * u, { size: 20 * u, weight: 600, family: DISPLAY, color: accent, spacing: 4 * u });
  const lines = wrap(ctx, title, maxW || W - 112 * u, size * u, 700, DISPLAY, 2);
  lines.forEach((l, i) => text(ctx, l, 56 * u - (1 - a) * 30 * u, (y + 18 + size * 0.95 * (i + 1)) * u, { size: size * u, weight: 700, family: DISPLAY }));
  ctx.globalAlpha = 1;
  return (y + 18 + size * 0.95 * lines.length) * u;
}

function statTiles(ctx, x, y, w, h, u, t, stats, accent, start = 0.35) {
  const n = stats.length, gap = 12 * u, tw = (w - gap * (n - 1)) / n;
  stats.forEach((s, i) => {
    const p = seg(t, start + i * 0.06, start + 0.3 + i * 0.06);
    const tx = x + i * (tw + gap);
    ctx.globalAlpha = p;
    rrect(ctx, tx, y + (1 - p) * 20 * u, tw, h, 10 * u); ctx.fillStyle = PALETTE.panel + 'e6'; ctx.fill();
    ctx.strokeStyle = PALETTE.line; ctx.lineWidth = 1.5 * u; ctx.stroke();
    text(ctx, s.label.toUpperCase(), tx + 18 * u, y + 34 * u, { size: 15 * u, color: PALETTE.muted, family: DISPLAY, weight: 600, spacing: 2 * u, max: tw - 30 * u });
    const val = typeof s.value === 'number' ? (s.format || nf)(s.value * p) : s.value;
    text(ctx, String(val), tx + 18 * u, y + h - 24 * u, { size: (s.size || 40) * u, family: MONO, weight: 500, color: i === 0 ? accent : PALETTE.fg, max: tw - 30 * u });
  });
  ctx.globalAlpha = 1;
}

// Draws a top-down render rotated nose-up, or a simple hull if the image is missing.
function topShip(ctx, img, cx, cy, len, beam, color, glow) {
  ctx.save(); ctx.translate(cx, cy);
  if (img) {
    ctx.rotate(Math.PI / 2);
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const bw = iw && ih ? len * (ih / iw) : beam;
    ctx.drawImage(img, -len / 2, -bw / 2, len, bw);
  } else {
    ctx.fillStyle = color + '55'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -len / 2); ctx.lineTo(beam / 2, len * 0.15); ctx.lineTo(beam * 0.3, len / 2); ctx.lineTo(-beam * 0.3, len / 2); ctx.lineTo(-beam / 2, len * 0.15); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// Tints an image with a colour while keeping its shading (hologram look).
const tintCache = new Map();
function tint(img, color) {
  if (!img) return null;
  const key = (img.src || img) + color;
  if (img.src && tintCache.has(key)) return tintCache.get(key);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.6; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  tintCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- scenes
const SCENES = {
  // data: { title, handle, avatar(img), ships: [{ name, L, B, career, img }], stats: [...], style: 'holo'|'real' }
  fleet(ctx, W, H, u, t, d, o) {
    let y = header(ctx, W, u, t, d.eyebrow || 'Fleet manifest', d.title, o.accent, { maxW: W - (d.avatar ? 260 : 112) * u });
    if (d.avatar) {
      const s = 128 * u, ax = W - 56 * u - s, ay = 70 * u;
      ctx.save(); rrect(ctx, ax, ay, s, s, 16 * u); ctx.clip(); ctx.drawImage(d.avatar, ax, ay, s, s); ctx.restore();
      rrect(ctx, ax, ay, s, s, 16 * u); ctx.strokeStyle = o.accent; ctx.lineWidth = 3 * u; ctx.stroke();
    }
    const statsH = 118 * u;
    const bottom = H - 120 * u - statsH - 30 * u;
    const area = { x: 56 * u, y: y + 30 * u, w: W - 112 * u, h: bottom - y - 30 * u };
    // Shelf-pack ships (biggest first) to fit the area.
    const ships = d.ships.slice().sort((a, b) => b.L - a.L).slice(0, 40);
    let scale = 1, rows;
    for (let k = 0; k < 40; k++) {
      rows = []; let row = { w: 0, h: 0, items: [] };
      const maxW = area.w / scale;
      for (const s of ships) {
        const gw = s.B * 1.2 + 2;
        if (row.items.length && row.w + gw > maxW) { rows.push(row); row = { w: 0, h: 0, items: [] }; }
        row.items.push(s); row.w += gw; row.h = Math.max(row.h, s.L);
      }
      rows.push(row);
      const totalH = rows.reduce((n, r) => n + r.h * 1.18 + 4, 0);
      const fitScale = Math.min(area.h / totalH, area.w / Math.max(...rows.map(r => r.w)));
      if (Math.abs(fitScale - scale) / scale < 0.01) break;
      scale = fitScale;
    }
    let yy = area.y + (area.h - rows.reduce((n, r) => n + r.h * 1.18 + 4, 0) * scale) / 2;
    let idx = 0;
    for (const r of rows) {
      let xx = area.x + (area.w - r.w * scale) / 2;
      for (const s of r.items) {
        const p = seg(t, 0.15 + idx * 0.02, 0.45 + idx * 0.02);
        const gw = (s.B * 1.2 + 2) * scale;
        const color = CAREER[s.career] || o.accent;
        ctx.globalAlpha = p;
        const img = d.style === 'real' ? s.img : tint(s.img, color);
        topShip(ctx, img, xx + gw / 2, yy + (r.h * scale) / 2 + (1 - p) * 60 * u, s.L * scale, s.B * scale, color, d.style === 'real' ? 0 : 14 * u);
        ctx.globalAlpha = 1;
        xx += gw; idx++;
      }
      yy += (r.h * 1.18 + 4) * scale;
    }
    // scan line
    if (t < 0.98) {
      const sy = area.y + area.h * seg(t, 0.1, 0.7);
      const g = ctx.createLinearGradient(0, sy - 40 * u, 0, sy);
      g.addColorStop(0, o.accent + '00'); g.addColorStop(1, o.accent + '66');
      ctx.fillStyle = g; ctx.fillRect(area.x, sy - 40 * u, area.w, 40 * u);
    }
    statTiles(ctx, 56 * u, H - 120 * u - statsH - 10 * u, W - 112 * u, statsH, u, t, d.stats, o.accent, 0.4);
  },

  // data: { ship, side(img), top(img), stats: [[label, value, max]], tags: [], price, pledge }
  ship(ctx, W, H, u, t, d, o) {
    const s = d.ship;
    let y = header(ctx, W, u, t, d.eyebrow || [s.maker, s.career].filter(Boolean).join(' · '), s.name, o.accent, { size: s.name.length > 18 ? 58 : 72 });
    text(ctx, s.role || '', 56 * u, y + 34 * u, { size: 28 * u, color: PALETTE.muted, max: W - 112 * u });
    const portrait = H > W * 1.3;
    const imgH = portrait ? H * 0.4 : H * (W > H ? 0.4 : 0.36);
    const iy = y + 60 * u;
    const im = d.side || d.top;
    if (d.photo) {
      // Real in-game screenshot as a framed hero image that drifts in slowly.
      const p = seg(t, 0.05, 0.45);
      const bw = W - 112 * u, bh = imgH + 20 * u, bx = 56 * u, byy = iy - 10 * u;
      const ar = d.photo.naturalWidth / d.photo.naturalHeight;
      const zoom = 1.12 - 0.08 * ease(t);
      let dw = bw * zoom, dh = dw / ar;
      if (dh < bh * zoom) { dh = bh * zoom; dw = dh * ar; }
      ctx.save();
      ctx.globalAlpha = p;
      rrect(ctx, bx, byy, bw, bh, 14 * u); ctx.clip();
      ctx.drawImage(d.photo, bx + (bw - dw) / 2, byy + (bh - dh) / 2, dw, dh);
      const vg = ctx.createLinearGradient(0, byy, 0, byy + bh);
      vg.addColorStop(0, '#0000'); vg.addColorStop(0.75, '#0000'); vg.addColorStop(1, PALETTE.bg + 'cc');
      ctx.fillStyle = vg; ctx.fillRect(bx, byy, bw, bh);
      ctx.restore();
      rrect(ctx, bx, byy, bw, bh, 14 * u); ctx.strokeStyle = o.accent + '88'; ctx.lineWidth = 2 * u; ctx.stroke();
    } else if (im) {
      const p = seg(t, 0.08, 0.5);
      const ar = (im.naturalWidth || im.width) / (im.naturalHeight || im.height);
      let w = W - 112 * u, h = w / ar;
      if (h > imgH) { h = imgH; w = h * ar; }
      ctx.save(); ctx.globalAlpha = p;
      ctx.shadowColor = o.accent + '88'; ctx.shadowBlur = 40 * u; ctx.shadowOffsetY = 18 * u;
      ctx.drawImage(im, (W - w) / 2 + (1 - p) * -160 * u, iy + (imgH - h) / 2, w, h);
      ctx.restore();
    }
    // stat bars
    const by = iy + imgH + 40 * u;
    const bars = d.stats.slice(0, portrait ? 6 : 4);
    const colW = portrait || W < 1100 ? W - 112 * u : (W - 112 * u - 30 * u) / 2;
    bars.forEach(([label, v, max, unit], i) => {
      const col = portrait || W < 1100 ? 0 : i % 2, row = portrait || W < 1100 ? i : Math.floor(i / 2);
      const rowGap = portrait ? 92 * u : 62 * u;
      const bx = 56 * u + col * (colW + 30 * u), byy = by + row * rowGap;
      const p = seg(t, 0.35 + i * 0.05, 0.75 + i * 0.05);
      const fs = portrait ? 22 : W > H ? 19 : 16;
      text(ctx, label.toUpperCase(), bx, byy, { size: fs * u, color: PALETTE.muted, family: DISPLAY, weight: 600, spacing: 2 * u });
      text(ctx, v != null ? `${nf(v * p)}${unit || ''}` : '—', bx + colW, byy, { size: (fs + 6) * u, align: 'right', family: MONO });
      rrect(ctx, bx, byy + 12 * u, colW, 12 * u, 6 * u); ctx.fillStyle = PALETTE.panel; ctx.fill();
      rrect(ctx, bx, byy + 12 * u, Math.max(6 * u, colW * clamp((v || 0) / (max || 1)) * p), 12 * u, 6 * u); ctx.fillStyle = o.accent; ctx.fill();
    });
    const tilesY = H - 120 * u - 118 * u - 10 * u;
    if (tilesY > by + (portrait || W < 1100 ? bars.length : Math.ceil(bars.length / 2)) * (portrait ? 92 : 62) * u + 10 * u) {
      statTiles(ctx, 56 * u, tilesY, W - 112 * u, 118 * u, u, t, d.tiles, o.accent, 0.5);
    }
  },

  // data: { title, eyebrow, rows: [{ name, rank, rep, next, nextAt, progress }] }
  rep(ctx, W, H, u, t, d, o) {
    let y = header(ctx, W, u, t, d.eyebrow || 'Reputation report', d.title, o.accent);
    const rows = d.rows.slice(0, H > W ? 10 : W > H ? 4 : 6);
    const rh = Math.min(120 * u, (H - 190 * u - y - 40 * u) / Math.max(1, rows.length));
    rows.forEach((r, i) => {
      const p = seg(t, 0.15 + i * 0.07, 0.6 + i * 0.07);
      const ry = y + 40 * u + i * rh;
      ctx.globalAlpha = p;
      text(ctx, r.name, 56 * u, ry + 30 * u, { size: 30 * u, weight: 600, family: DISPLAY, max: W * 0.55 });
      text(ctx, r.rank, W - 56 * u, ry + 30 * u, { size: 24 * u, align: 'right', color: o.accent, family: DISPLAY, weight: 600 });
      rrect(ctx, 56 * u, ry + 46 * u, W - 112 * u, 14 * u, 7 * u); ctx.fillStyle = PALETTE.panel; ctx.fill();
      rrect(ctx, 56 * u, ry + 46 * u, Math.max(8 * u, (W - 112 * u) * r.progress * p), 14 * u, 7 * u); ctx.fillStyle = o.accent; ctx.fill();
      text(ctx, `${nf(r.rep * p)} rep${r.next ? ` · ${nf(r.nextAt - r.rep)} to ${r.next}` : ' · top rank'}`, 56 * u, ry + 88 * u, { size: 19 * u, color: PALETTE.muted, family: MONO });
      ctx.globalAlpha = 1;
    });
  },

  // data: { eyebrow, title, date, kinds: [], summary, days }
  event(ctx, W, H, u, t, d, o) {
    const y = header(ctx, W, u, t, d.eyebrow || 'Coming up in the \'verse', d.title, o.accent, { size: 76 });
    const lines = wrap(ctx, d.summary, W - 112 * u, 32 * u, 500, BODY, H > W ? 7 : 3);
    ctx.globalAlpha = seg(t, 0.2, 0.45);
    lines.forEach((l, i) => text(ctx, l, 56 * u, y + 60 * u + i * 44 * u, { size: 32 * u, color: PALETTE.fg }));
    ctx.globalAlpha = 1;
    // countdown
    const cy = Math.max(y + 60 * u + lines.length * 44 * u + 50 * u, H * (H > W ? 0.5 : 0.42));
    const p = seg(t, 0.3, 0.8);
    const days = Math.round(d.days * p);
    text(ctx, String(days), 56 * u, cy + 190 * u, { size: 230 * u, weight: 700, family: DISPLAY, color: o.accent });
    font(ctx, 700, 230 * u, DISPLAY);
    const dw = ctx.measureText(String(days)).width;
    text(ctx, days === 1 ? 'DAY TO GO' : 'DAYS TO GO', 56 * u + dw + 24 * u, cy + 120 * u, { size: 34 * u, weight: 600, family: DISPLAY, spacing: 3 * u });
    text(ctx, d.date, 56 * u + dw + 24 * u, cy + 170 * u, { size: 26 * u, color: PALETTE.muted, family: MONO });
    (d.kinds || []).forEach((k, i) => {
      font(ctx, 600, 22 * u, DISPLAY);
      const w = ctx.measureText(k.toUpperCase()).width + 36 * u;
      const x = 56 * u + (d.kinds.slice(0, i).reduce((n, kk) => { font(ctx, 600, 22 * u, DISPLAY); return n + ctx.measureText(kk.toUpperCase()).width + 48 * u; }, 0));
      rrect(ctx, x, cy + 230 * u, w, 46 * u, 8 * u); ctx.strokeStyle = k === 'Free Fly' ? PALETTE.good : o.accent; ctx.lineWidth = 2 * u; ctx.stroke();
      text(ctx, k.toUpperCase(), x + 18 * u, cy + 261 * u, { size: 22 * u, weight: 600, family: DISPLAY, color: k === 'Free Fly' ? PALETTE.good : o.accent });
    });
  },

  // data: { eyebrow, title, items: [{ title, sub, value, value2 }] }
  list(ctx, W, H, u, t, d, o) {
    const y = header(ctx, W, u, t, d.eyebrow, d.title, o.accent, { size: 62 });
    const items = d.items.slice(0, H > W ? 7 : W > H ? 4 : 5);
    const rh = Math.min(150 * u, (H - 190 * u - y - 30 * u) / items.length);
    items.forEach((it, i) => {
      const p = seg(t, 0.15 + i * 0.08, 0.55 + i * 0.08);
      const ry = y + 30 * u + i * rh;
      ctx.globalAlpha = p;
      rrect(ctx, 56 * u + (1 - p) * 80 * u, ry, W - 112 * u, rh - 14 * u, 12 * u); ctx.fillStyle = PALETTE.panel + 'e6'; ctx.fill();
      ctx.strokeStyle = PALETTE.line; ctx.lineWidth = 1.5 * u; ctx.stroke();
      text(ctx, String(i + 1).padStart(2, '0'), 84 * u, ry + rh / 2 + 6 * u, { size: 34 * u, family: MONO, color: o.accent });
      text(ctx, it.title, 160 * u, ry + rh / 2 - 8 * u, { size: 30 * u, weight: 600, family: DISPLAY, max: W - 560 * u });
      text(ctx, it.sub || '', 160 * u, ry + rh / 2 + 26 * u, { size: 20 * u, color: PALETTE.muted, max: W - 560 * u });
      text(ctx, it.value || '', W - 84 * u, ry + rh / 2 - 6 * u, { size: 32 * u, family: MONO, align: 'right', color: o.accent });
      if (it.value2) text(ctx, it.value2, W - 84 * u, ry + rh / 2 + 26 * u, { size: 19 * u, family: MONO, align: 'right', color: PALETTE.good });
      ctx.globalAlpha = 1;
    });
  },

  // data: { eyebrow, title, stats: [{ label, value }] }
  numbers(ctx, W, H, u, t, d, o) {
    const y = header(ctx, W, u, t, d.eyebrow, d.title, o.accent, { size: 70 });
    const cols = W > H ? 3 : 2;
    const items = d.stats.slice(0, cols * (H > W ? 4 : 2));
    const cw = (W - 112 * u - (cols - 1) * 16 * u) / cols, ch = Math.min(220 * u, (H - 200 * u - y - 40 * u) / Math.ceil(items.length / cols) - 16 * u);
    items.forEach((s, i) => {
      const p = seg(t, 0.15 + i * 0.06, 0.65 + i * 0.06);
      const x = 56 * u + (i % cols) * (cw + 16 * u), yy = y + 40 * u + Math.floor(i / cols) * (ch + 16 * u);
      ctx.globalAlpha = p;
      rrect(ctx, x, yy, cw, ch, 14 * u); ctx.fillStyle = PALETTE.panel + 'e6'; ctx.fill(); ctx.strokeStyle = PALETTE.line; ctx.lineWidth = 1.5 * u; ctx.stroke();
      text(ctx, nf(s.value * p), x + 26 * u, yy + ch * 0.58, { size: Math.min(86 * u, ch * 0.45), family: DISPLAY, weight: 700, color: i === 0 ? o.accent : PALETTE.fg, max: cw - 50 * u });
      text(ctx, s.label.toUpperCase(), x + 26 * u, yy + ch * 0.58 + 44 * u, { size: 18 * u, family: DISPLAY, weight: 600, color: PALETTE.muted, spacing: 2 * u, max: cw - 50 * u });
      ctx.globalAlpha = 1;
    });
  },
};

export function drawCard(ctx, { scene, data, format = 'square', t = 1, accent = PALETTE.accent, referral = true, site = '' }) {
  const { w: W, h: H } = FORMATS[format];
  const u = Math.min(W, H) / 1080;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  background(ctx, W, H, t, accent);
  SCENES[scene](ctx, W, H, u, t, data, { accent });
  brackets(ctx, W, H, u, accent, t);
  footer(ctx, W, H, u, { accent, referral, site });
  ctx.restore();
}

// Records the animated card to a video file. Returns { blob, ext }.
export async function recordCard(canvas, opts, { seconds = 6, onProgress } = {}) {
  const types = ['video/mp4;codecs=avc1.42E01F', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const mimeType = types.find(t => window.MediaRecorder?.isTypeSupported?.(t));
  if (!mimeType || !canvas.captureStream) throw new Error('Video recording isn\'t supported in this browser. Try Chrome, Edge or Firefox.');
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(res => { rec.onstop = res; });
  const ctx = canvas.getContext('2d');
  const total = seconds * 1000, hold = 1200;
  rec.start(250);
  const start = performance.now();
  await new Promise(resolve => {
    const frame = now => {
      const el = now - start;
      drawCard(ctx, { ...opts, t: Math.min(1, el / (total - hold)) });
      onProgress?.(Math.min(1, el / total));
      if (el < total) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach(tr => tr.stop());
  return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), ext: mimeType.includes('mp4') ? 'mp4' : 'webm' };
}
