// Ship art helpers. Painted (textured) renders exist for about a third of ships; for the
// rest we recolour the detailed plain-hull render with the manufacturer's usual hull
// colours, keeping all of its shading. Those are labelled as approximate colours.

// Typical hull colours per manufacturer code (primary hull tone).
const MAKER_PAINT = {
  AEGS: '#5d646c', ANVL: '#6f7562', ARGO: '#d7a12a', BANU: '#93704d', CNOU: '#d9d3c7', CRUS: '#c8d5e6', DRAK: '#5a574c',
  ESPR: '#454a52', GAMA: '#b39c6c', GRIN: '#d8b23a', KRIG: '#8d949c', MISC: '#9da78f', MRAI: '#e4e2de', ORIG: '#ece8df',
  RSI: '#c3cbd6', TMBL: '#a68d5f', VNCL: '#5d6268', XNAA: '#cdbd8b', AOPO: '#7a8f6a', XIAN: '#cdbd8b', CRUSADER: '#c8d5e6',
};
export const paintFor = s => MAKER_PAINT[(s.makerCode || '').toUpperCase()] || '#a9b2ba';

// Best available top/side view: painted render first, otherwise the plain render
// (which callers recolour with recolour()).
export const topArt = s => (s.topC ? { url: s.topC, hi: s.topCHi, painted: true } : s.top ? { url: s.top, hi: s.topHi, painted: false } : null);
export const sideArt = s => (s.angleC || s.sideC ? { url: s.angleC || s.sideC, painted: true } : s.side ? { url: s.side, painted: false } : null);

// Mixes a hex colour toward white (amount 0–1).
export function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = v => Math.round(v + (255 - v) * amount);
  return `rgb(${ch(n >> 16)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

const cache = new Map();
// Returns a canvas with the image recoloured (hue/saturation from color, shading from the image).
export function recolour(img, color) {
  if (!img) return null;
  const key = `${img.src}|${color}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  // Multiply darkens/tints toward the hull colour while the render's shading shows through.
  x.globalCompositeOperation = 'multiply';
  if (x.globalCompositeOperation !== 'multiply') { x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.5; }
  x.fillStyle = lighten(color, 0.18); x.fillRect(0, 0, c.width, c.height);
  // Restore the original transparency.
  x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in';
  x.drawImage(img, 0, 0);
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- in-game screenshot cutouts
// Wiki "in space" screenshots have the ship on a starfield. To lay ships out on our own
// background we flood-fill the dark sky from the image edges, drop isolated specks
// (stars), and crop to the ship. Returns { canvas, frac } where frac is the fraction of
// the image width the ship occupies (used for scale). Requires a same-origin or CORS image.
const cutCache = new Map();
export function cutout(img, { threshold = 34 } = {}) {
  if (!img) return null;
  const key = img.src;
  if (cutCache.has(key)) return cutCache.get(key);
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  let data;
  try { data = x.getImageData(0, 0, W, H); } catch { return null; } // tainted: no cutout possible
  const px = data.data;
  const lum = i => (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11);
  const sky = new Uint8Array(W * H); // 1 = background
  // Flood fill dark pixels connected to the border. Stars are bright, so we treat any
  // pixel whose 5x5 neighbourhood minimum is dark as sky, which swallows the star specks.
  // Summed-area table of dark pixels so each 5x5 neighbourhood check is O(1).
  const sat = new Uint32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let xx = 0; xx < W; xx++) {
      row += lum((y * W + xx) * 4) < threshold ? 1 : 0;
      sat[(y + 1) * (W + 1) + xx + 1] = sat[y * (W + 1) + xx + 1] + row;
    }
  }
  const darkish = new Uint8Array(W * H);
  const R = 2;
  for (let y = 0; y < H; y++) {
    const y0 = Math.max(0, y - R), y1 = Math.min(H, y + R + 1);
    for (let xx = 0; xx < W; xx++) {
      const x0 = Math.max(0, xx - R), x1 = Math.min(W, xx + R + 1);
      const d = sat[y1 * (W + 1) + x1] - sat[y0 * (W + 1) + x1] - sat[y1 * (W + 1) + x0] + sat[y0 * (W + 1) + x0];
      darkish[y * W + xx] = d / ((y1 - y0) * (x1 - x0)) > 0.55 ? 1 : 0;
    }
  }
  const stack = [];
  const push = i => { if (!sky[i] && darkish[i]) { sky[i] = 1; stack.push(i); } };
  for (let xx = 0; xx < W; xx++) { push(xx); push((H - 1) * W + xx); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop(), y = (i / W) | 0, xx = i - y * W;
    if (xx > 0) push(i - 1); if (xx < W - 1) push(i + 1); if (y > 0) push(i - W); if (y < H - 1) push(i + W);
  }
  // Apply alpha with a soft 1px edge and find the ship's bounding box.
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = y * W + xx;
    if (sky[i]) { px[i * 4 + 3] = 0; continue; }
    const edge = (xx > 0 && sky[i - 1]) || (xx < W - 1 && sky[i + 1]) || (y > 0 && sky[i - W]) || (y < H - 1 && sky[i + W]);
    if (edge) px[i * 4 + 3] = 150;
    if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX <= minX || maxY <= minY) { cutCache.set(key, null); return null; }
  x.putImageData(data, 0, 0);
  const out = document.createElement('canvas');
  out.width = maxX - minX + 1; out.height = maxY - minY + 1;
  out.getContext('2d').drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  const res = { canvas: out, frac: out.width / W };
  if (cutCache.size > 120) cutCache.delete(cutCache.keys().next().value);
  cutCache.set(key, res);
  return res;
}

// Same-origin URL for an image (through the site's image relay when available) so it can be cut out.
export const relayed = url => (url ? `/api/img?u=${encodeURIComponent(url)}` : null);

// Wiki thumbnails can be requested at any width by editing the "NNNpx-" part of the URL.
export const wikiWidth = (url, w) => (url && /\/thumb\//.test(url) ? url.replace(/\/(\d+)px-/, `/${w}px-`) : url);
