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
