// Latest videos from YouTube channels. Tries the channel's RSS feed first and falls
// back to reading the public /videos page when the feed is unavailable.
export const CHANNELS = [
  { id: 'UCTeLqJq1mXUX5WWoNXLmOIA', handle: '@RobertsSpaceInd', name: 'Star Citizen' },
  { id: 'UCU-xYE7KrmqarZ3Lqu2PK_w', handle: '@Squadron42', name: 'Squadron 42' },
];
const UA = { 'User-Agent': 'Mozilla/5.0 (VerseAtlas video list)', 'Accept-Language': 'en-US,en;q=0.8' };
const decode = s => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function fromFeed(xml, ch) {
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).map(e => ({
    id: (e.match(/<yt:videoId>([^<]+)</) || [])[1],
    title: decode((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
    date: (e.match(/<published>([^<]+)</) || [])[1] || null,
    channel: ch.name,
  })).filter(v => v.id);
}

function fromPage(page, ch) {
  const m = page.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
  if (!m) return [];
  const out = [];
  const walk = o => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.lockupViewModel?.contentId) {
      const v = o.lockupViewModel;
      const meta = v.metadata?.lockupMetadataViewModel;
      const parts = (meta?.metadata?.contentMetadataViewModel?.metadataRows || []).flatMap(r => (r.metadataParts || []).map(p => p.text?.content)).filter(Boolean);
      out.push({ id: v.contentId, title: meta?.title?.content, ago: parts.find(p => /ago$/i.test(p)) || null, views: parts.find(p => /^[\d.,]+[KMB]?$/.test(p) || /views?$/.test(p)) || null, channel: ch.name });
    } else if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      out.push({ id: v.videoId, title: (v.title?.runs || []).map(r => r.text).join(''), ago: v.publishedTimeText?.simpleText || null, views: v.shortViewCountText?.simpleText || null, channel: ch.name });
    }
    Object.values(o).forEach(walk);
  };
  try { walk(JSON.parse(m[1])); } catch { return []; }
  return out;
}

// Turns "3 days ago" into an approximate ISO date so videos from both channels sort together.
function agoToDate(ago, now = Date.now()) {
  const m = /(\d+)\s*(mo|months?|y|yrs?|years?|w|wks?|weeks?|d|days?|h|hrs?|hours?|min|mins?|minutes?|m|s|secs?|seconds?)\b\s*ago/i.exec(ago || '');
  if (!m) return null;
  const u = m[2].toLowerCase();
  const ms = u.startsWith('mo') ? 2592e6 : u.startsWith('y') ? 31536e6 : u.startsWith('w') ? 6048e5 : u.startsWith('d') ? 864e5
    : u.startsWith('h') ? 36e5 : u.startsWith('mi') || u === 'm' ? 6e4 : 1e3;
  return new Date(now - +m[1] * ms).toISOString();
}

export async function latestVideos(limit = 18) {
  const all = await Promise.all(CHANNELS.map(async ch => {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`, { headers: UA });
      if (r.ok) { const v = fromFeed(await r.text(), ch); if (v.length) return v; }
    } catch { /* fall through */ }
    try {
      const r = await fetch(`https://www.youtube.com/${ch.handle}/videos`, { headers: UA });
      if (r.ok) return fromPage(await r.text(), ch).map(v => ({ ...v, date: agoToDate(v.ago) }));
    } catch { /* unavailable */ }
    return [];
  }));
  const seen = new Set();
  return all.flatMap(list => list.slice(0, limit))
    .filter(v => v.id && !seen.has(v.id) && seen.add(v.id))
    .map(v => ({ ...v, link: `https://www.youtube.com/watch?v=${v.id}`, thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
