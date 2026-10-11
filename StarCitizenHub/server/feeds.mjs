// Live feeds: official news (refreshed on a timer), RSI service status, and an
// optional Discord channel feed for leaks & rumors.
//
// Discord feed setup: create a bot for the same Discord app used for sign-in, turn on
// the MESSAGE CONTENT intent, and have the source server's admins invite it with
// "View Channel" + "Read Message History" on the channels to follow. Then set
//   DISCORD_BOT_TOKEN=...
//   DISCORD_FEED_CHANNELS=123456789012345678:Leaks,234567890123456789:Datamining
//   FEED_AUTO_PUBLISH=0        (1 = publish without admin approval)
import * as db from './db.mjs';

const WIKI = 'https://api.star-citizen.wiki/api/v2';
const DISCORD = process.env.DISCORD_BASE_URL || 'https://discord.com';
const UA = { 'User-Agent': 'VerseAtlas (fan site)' };

// ---------------------------------------------------------------- official news
const news = { updated: null, commLinks: [], videos: [], status: null, versions: null };

async function json(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...UA, ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
  return r.json();
}

function parseYouTube(xml) {
  return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 18).map(e => ({
    title: (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
    link: (e.match(/<link rel="alternate" href="([^"]+)"/) || [])[1],
    date: (e.match(/<published>([^<]+)<\/published>/) || [])[1],
    videoId: (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1],
    thumb: (e.match(/<media:thumbnail url="([^"]+)"/) || [])[1],
  }));
}

export async function refreshNews() {
  const tasks = [
    json(`${WIKI}/comm-links?page%5Bsize%5D=40`).then(r => {
      news.commLinks = (r.data || []).map(c => {
        const body = c.translations?.en_EN || '';
        return {
          id: c.id, title: c.title, link: c.rsi_url, date: c.created_at,
          channel: c.channel && c.channel !== 'Undefined' ? c.channel : null,
          category: c.category && c.category !== 'Undefined' ? c.category : null,
          series: c.series && c.series !== 'None' ? c.series : null,
          summary: body.replace(/\s+/g, ' ').trim().slice(0, 320) || null,
        };
      });
    }),
    fetch('https://www.youtube.com/feeds/videos.xml?channel_id=UCTeLqJq1mXUX5WWoNXLmOIA', { headers: UA })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then(x => { news.videos = parseYouTube(x); }),
    json('https://status.robertsspaceindustries.com/index.json').then(s => {
      news.status = { summary: s.summaryStatus, systems: (s.systems || []).map(x => ({ name: x.name, status: x.status, issues: (x.unresolvedIssues || []).length })), url: 'https://status.robertsspaceindustries.com/' };
    }),
    json('https://api.uexcorp.space/2.0/game_versions').then(v => { news.versions = v.data; }),
  ];
  await Promise.allSettled(tasks);
  news.updated = new Date().toISOString();
  return news;
}
export const getNews = () => news;

// ---------------------------------------------------------------- Discord channel feed
export const feedConfigured = () => !!process.env.DISCORD_BOT_TOKEN && !!process.env.DISCORD_FEED_CHANNELS;
const channels = () => (process.env.DISCORD_FEED_CHANNELS || '').split(',').map(s => s.trim()).filter(Boolean).map(s => {
  const [id, ...label] = s.split(':');
  return { id: id.trim(), label: label.join(':').trim() || null };
});
const bot = path => json(`${DISCORD}/api/v10${path}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` } });

function toItem(m, ch, label) {
  return {
    source: 'discord', sourceId: m.id, channelId: ch.id, channelLabel: label,
    authorName: m.author?.global_name || m.author?.username || 'Unknown',
    authorAvatar: m.author?.avatar ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64` : null,
    content: (m.content || '').slice(0, 6000),
    attachments: (m.attachments || []).slice(0, 8).map(a => ({ url: a.url, name: a.filename, type: a.content_type || '', width: a.width || null, height: a.height || null })),
    embeds: (m.embeds || []).slice(0, 4).map(e => ({
      title: e.title || null, description: (e.description || '').slice(0, 1200) || null, url: e.url || null,
      image: e.image?.url || e.thumbnail?.url || null, provider: e.provider?.name || e.author?.name || null,
    })),
    postedAt: m.timestamp,
    approved: process.env.FEED_AUTO_PUBLISH === '1',
  };
}

const labels = new Map();
export async function pollDiscord() {
  if (!feedConfigured() || !db.dbEnabled()) return 0;
  let added = 0;
  for (const ch of channels()) {
    try {
      if (!labels.has(ch.id)) {
        const info = await bot(`/channels/${ch.id}`).catch(() => ({}));
        labels.set(ch.id, ch.label || (info.name ? `#${info.name}` : 'Discord'));
      }
      const after = await db.lastFeedId(ch.id);
      const msgs = await bot(`/channels/${ch.id}/messages?limit=50${after ? `&after=${after}` : ''}`);
      for (const m of msgs.reverse()) {
        if (m.type !== 0 && m.type !== 19) continue; // normal messages and replies only
        if (!m.content && !m.attachments?.length && !m.embeds?.length) continue;
        await db.insertFeedItem(toItem(m, ch, labels.get(ch.id)));
        added++;
      }
    } catch (e) { console.warn(`Discord feed: channel ${ch.id}: ${e.message}`); }
  }
  return added;
}

// Discord attachment links are signed and expire; refresh one when needed.
export async function freshAttachmentUrl(itemId, idx) {
  const a = await db.feedAttachment(itemId, idx);
  if (!a) return null;
  const ex = Number.parseInt(new URL(a.url).searchParams.get('ex') || '', 16);
  if (!ex || ex * 1000 > Date.now() + 3600 * 1000 || !process.env.DISCORD_BOT_TOKEN) return a.url;
  try {
    const r = await fetch(`${DISCORD}/api/v10/attachments/refresh-urls`, {
      method: 'POST',
      headers: { ...UA, Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachment_urls: [a.url] }),
    });
    const fresh = (await r.json()).refreshed_urls?.[0]?.refreshed;
    if (fresh) { await db.updateFeedAttachmentUrl(itemId, idx, fresh); return fresh; }
  } catch { /* fall back to the stored link */ }
  return a.url;
}

export function startFeeds() {
  refreshNews().catch(() => {});
  setInterval(() => refreshNews().catch(() => {}), 20 * 60 * 1000).unref();
  if (feedConfigured()) {
    pollDiscord().catch(() => {});
    setInterval(() => pollDiscord().catch(() => {}), 3 * 60 * 1000).unref();
  }
}
