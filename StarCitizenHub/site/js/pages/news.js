import { html, raw, render, icon, load, timeAgo, errorBox, esc, toast, videoCard } from '../lib.js';
import { session, api } from '../account.js';

const yt = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const LINKS = [
  ['Official', [
    ['RSI Comm-Links', 'https://robertsspaceindustries.com/comm-link', 'News, patch announcements, ship reveals'],
    ['Patch notes', 'https://robertsspaceindustries.com/spectrum/community/SC/forum/190048', 'Every LIVE and PTU patch, on Spectrum'],
    ['Public roadmap', 'https://robertsspaceindustries.com/roadmap/release-view', "What's planned for upcoming patches"],
    ['Server status', 'https://status.robertsspaceindustries.com/', 'Check here first if you can\'t log in'],
    ['Issue Council', 'https://issue-council.robertsspaceindustries.com/', 'Report bugs and vote on known ones'],
    ['Spectrum forums', 'https://robertsspaceindustries.com/spectrum/community/SC', 'Official forums and chat'],
    ['Knowledge base', 'https://support.robertsspaceindustries.com/hc/en-us', 'Official help articles and support'],
    ['Galactapedia', 'https://robertsspaceindustries.com/galactapedia', 'Official lore encyclopedia'],
    ['Star Citizen on YouTube', 'https://www.youtube.com/@RobertsSpaceInd', 'Inside Star Citizen, Star Citizen Live, trailers'],
    ['Squadron 42 on YouTube', 'https://www.youtube.com/@Squadron42', 'The single-player campaign'],
  ]],
  ['Community tools', [
    ['Star Citizen Wiki', 'https://starcitizen.tools/', 'The community encyclopedia'],
    ['UEX Corp', 'https://uexcorp.space/', 'Trade routes, commodity and item prices'],
    ['Erkul', 'https://www.erkul.games/', 'Ship loadout and DPS calculator'],
    ['SC Trade Tools', 'https://sc-trade.tools/', 'Trading and mining route planner'],
    ['Regolith', 'https://regolith.rocks/', 'Mining sessions, refining and payouts'],
    ['SCMDB', 'https://scmdb.net/', 'Mission and crafting database'],
    ['FleetYards', 'https://fleetyards.net/', 'Fleet manager and ship database'],
    ['Hangar.link', 'https://hangar.link/', 'Hangar viewer'],
    ['Cornerstone Universe', 'https://finder.cstone.space/', 'Find where items are sold'],
  ]],
  ['Places to hang out', [
    ['r/starcitizen', 'https://www.reddit.com/r/starcitizen/', 'The biggest Star Citizen subreddit'],
    ['Official Discord', 'https://discord.gg/starcitizen', 'Chat, LFG and new-player help'],
    ['Org finder', 'https://robertsspaceindustries.com/community/orgs/listing', 'Find an organisation to join'],
    ['Community Hub', 'https://robertsspaceindustries.com/community-hub', 'Screenshots, videos and fan art'],
  ]],
  ['Videos to start with', [
    ['New player guides', yt('Star Citizen new player guide 4.x'), 'Search for current beginner walkthroughs'],
    ['Inside Star Citizen', yt('Inside Star Citizen'), 'Weekly(ish) development show'],
    ['Star Citizen Live', yt('Star Citizen Live'), 'Developer Q&A streams'],
    ['Ship reviews', yt('Star Citizen ship review 4.10'), 'Help picking your next ship'],
    ['Money-making guides', yt('Star Citizen best money making 4.10'), 'Current earning methods'],
  ]],
];

// Renders Discord-flavoured markdown safely: escape first, then add formatting.
export function discordMarkdown(text) {
  let s = esc(text || '');
  const blocks = [];
  s = s.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, c) => { blocks.push(`<pre class="dc-code">${c}</pre>`); return `\u0000${blocks.length - 1}\u0000`; });
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler" tabindex="0" title="Spoiler: click to reveal">$1</span>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
    .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>')
    .replace(/&lt;t:(\d+)(?::\w)?&gt;/g, (_, t) => new Date(t * 1000).toLocaleString())
    .replace(/&lt;a?:(\w+):\d+&gt;/g, ':$1:')
    .replace(/&lt;@[!&]?\d+&gt;/g, '@member')
    .replace(/&lt;#\d+&gt;/g, '#channel')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,)!?'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer nofollow">$1</a>')
    .replace(/^#{1,3} (.+)$/gm, '<b class="dc-h">$1</b>')
    .replace(/^&gt; (.*)$/gm, '<span class="dc-quote">$1</span>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
  return raw(s.replace(/\n/g, '<br>'));
}

const TABS = [['news', 'Official news'], ['leaks', 'Leaks & rumors'], ['videos', 'Videos'], ['links', 'Community links']];

export default async function news(main, { meta, params }) {
  // Live news from the server when available, otherwise the build-time snapshot.
  let data;
  try { data = await api('/api/news'); } catch { data = null; }
  if (!data?.commLinks?.length) {
    try { data = { ...(await load('news')), ...(data || {}), commLinks: (await load('news')).commLinks }; } catch (e) { render(main, errorBox(e)); return; }
  }
  const tab = TABS.some(t => t[0] === params.tab) ? params.tab : 'news';
  const st = data.status;
  const statusChip = s => html`<span class="chip ${s === 'operational' ? 'chip-live' : s ? 'chip-warn' : ''}">${s || 'unknown'}</span>`;

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Community</span>
      <h1>News, leaks & links</h1>
      <p class="lede">Official posts from CIG, the latest leaks and datamining from the community, videos, and the tools everyone uses.</p>
    </div>
    <div class="stat-row" style="margin-bottom:18px">
      <div class="stat hi"><span>LIVE version</span><b>${data.versions?.live || meta.gameVersion || '—'}</b></div>
      <div class="stat"><span>PTU (test server)</span><b>${data.versions?.ptu || 'Not running'}</b></div>
      <div class="stat"><span>RSI services</span><b style="font-size:1rem">${st ? html`<a href="${st.url}" target="_blank" rel="noopener noreferrer">${st.summary === 'operational' ? 'All operational' : st.summary}</a>` : '—'}</b></div>
      <div class="stat"><span>Updated</span><b style="font-size:1rem">${timeAgo(data.updated)}</b></div>
    </div>
    ${st?.systems?.length ? html`<div class="chips" style="margin-bottom:18px">${st.systems.map(x => html`<span class="chip">${x.name}</span>${statusChip(x.status)}`)}</div>` : ''}
    <div class="seg" id="ntabs" style="margin-bottom:16px">${TABS.map(([k, l]) => html`<button type="button" data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`)}</div>
    <div id="nbody"></div>
  `);
  const body = document.getElementById('nbody');
  const show = t => {
    document.querySelectorAll('#ntabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    history.replaceState(null, '', `#/news${t === 'news' ? '' : `?tab=${t}`}`);
    if (t === 'leaks') return leaks(body);
    if (t === 'videos') return videos(body, data);
    if (t === 'links') return linksTab(body);
    return official(body, data);
  };
  document.getElementById('ntabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); });
  show(tab);
}

function official(body, data) {
  const channels = [...new Set((data.commLinks || []).map(n => n.channel).filter(Boolean))];
  let channel = '';
  render(body, html`<div class="split">
    <div class="panel">
      <div class="panel-title"><h2>Latest comm-links</h2><a href="https://robertsspaceindustries.com/comm-link" target="_blank" rel="noopener noreferrer">All on RSI ${icon('ext', 'i-sm')}</a></div>
      <div class="seg" id="nchan" style="margin-bottom:6px"><button type="button" class="on" data-c="">All</button>${channels.map(c => html`<button type="button" data-c="${c}">${c}</button>`)}</div>
      <div id="nlist"></div>
    </div>
    <div class="stack">
      <div class="panel"><h3 style="margin-bottom:8px">Official sources</h3><div class="link-list">${LINKS[0][1].map(([t, u, d]) => html`<a href="${u}" target="_blank" rel="noopener noreferrer"><span>${t}<small>${d}</small></span>${icon('ext')}</a>`)}</div></div>
    </div>
  </div>`);
  const draw = () => render(document.getElementById('nlist'), (data.commLinks || []).filter(n => !channel || n.channel === channel).map(n => html`
    <div class="news-item">
      <div class="chips">${n.channel ? html`<span class="chip">${n.channel}</span>` : ''}${n.series ? html`<span class="chip">${n.series}</span>` : ''}<span class="chip">${timeAgo(n.date)}</span></div>
      <h3><a href="${n.link}" target="_blank" rel="noopener noreferrer">${n.title}</a></h3>
      ${n.summary ? html`<p>${n.summary}${n.summary.length >= 320 ? '…' : ''}</p>` : ''}
    </div>`));
  document.getElementById('nchan').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    channel = b.dataset.c;
    document.querySelectorAll('#nchan button').forEach(x => x.classList.toggle('on', x === b));
    draw();
  });
  draw();
}

async function leaks(body) {
  render(body, html`<div class="loading">Loading the latest leaks…</div>`);
  const admin = session.user?.admin;
  let pending = false;
  const load = async () => {
    let feed;
    try { feed = await api(`/api/feed${pending ? '?pending=1' : ''}`); } catch (e) { feed = { configured: false, items: [], error: e.message }; }
    render(body, html`
      <div class="callout callout-warn" style="margin-bottom:14px;max-width:none">${icon('info')}<span><b>Unconfirmed.</b> Leaks, datamining and rumors shared by the community. Unreleased content often changes or gets cut, so treat these as rumors until CIG announces them or they reach the PTU.</span></div>
      ${admin ? html`<div class="filters" style="margin-bottom:12px">
        <label class="check"><input type="checkbox" id="lk-pending" ${pending ? 'checked' : ''}> Show posts waiting for approval</label>
        <button class="btn btn-sm" type="button" id="lk-poll">Check Discord now</button>
        <span class="muted" style="font-size:.85rem">${feed.autoPublish ? 'Auto-publish is on.' : 'New posts need your approval before visitors see them.'}</span></div>` : ''}
      ${!feed.configured && !feed.items.length ? html`<div class="empty"><h2>The leaks feed isn't connected yet</h2><p>Once the site's Discord bot is added to the community server, new posts appear here automatically.</p></div>` : ''}
      ${feed.configured && !feed.items.length ? html`<div class="empty"><h2>Nothing here yet</h2><p>${pending ? 'No posts are waiting.' : 'New posts from the community will show up here.'}</p></div>` : ''}
      <div class="feed">${feed.items.map(it => feedCard(it, admin))}</div>`);
    document.getElementById('lk-pending')?.addEventListener('change', e => { pending = e.target.checked; load(); });
    document.getElementById('lk-poll')?.addEventListener('click', async () => { try { const r = await api('/api/feed/poll', { method: 'POST' }); toast(`${r.added} new post${r.added === 1 ? '' : 's'} pulled from Discord`); load(); } catch (e) { toast(e.message, 'warn'); } });
  };
  body.onclick = async e => {
    const sp = e.target.closest('.spoiler'); if (sp) { sp.classList.add('shown'); return; }
    const a = e.target.closest('[data-approve]');
    const h = e.target.closest('[data-hide]');
    try {
      if (a) { await api(`/api/feed/${a.dataset.approve}/approve`, { method: 'POST', body: { approved: a.dataset.on === '1' } }); toast(a.dataset.on === '1' ? 'Published' : 'Unpublished'); load(); }
      if (h) { await api(`/api/feed/${h.dataset.hide}`, { method: 'DELETE' }); toast('Removed from the feed'); load(); }
    } catch (err) { toast(err.message, 'warn'); }
  };
  load();
}

function feedCard(it, admin) {
  const images = (it.attachments || []).map((a, i) => ({ ...a, i })).filter(a => /^image\//.test(a.type) || /\.(png|jpe?g|gif|webp)$/i.test(a.name || ''));
  const files = (it.attachments || []).map((a, i) => ({ ...a, i })).filter(a => !images.includes(a));
  return html`<article class="panel feed-item ${it.approved ? '' : 'pending'}">
    <header class="feed-head">
      ${it.author_avatar ? html`<img src="${it.author_avatar}" alt="" referrerpolicy="no-referrer">` : html`<span class="feed-av">${(it.author_name || '?').slice(0, 1)}</span>`}
      <div style="min-width:0"><b>${it.author_name}</b><div class="muted" style="font-size:.82rem">${it.channel_label || 'Discord'} · ${timeAgo(it.posted_at)}</div></div>
      ${it.approved ? '' : html`<span class="chip chip-warn" style="margin-left:auto">Waiting for approval</span>`}
    </header>
    ${it.content ? html`<div class="feed-text">${discordMarkdown(it.content)}</div>` : ''}
    ${images.length ? html`<div class="feed-media ${images.length > 1 ? 'multi' : ''}">${images.map(a => html`<a href="/api/feed/media/${it.id}/${a.i}" target="_blank" rel="noopener noreferrer"><img src="/api/feed/media/${it.id}/${a.i}" alt="${a.name || 'Attachment'}" loading="lazy"></a>`)}</div>` : ''}
    ${files.length ? html`<div class="chips">${files.map(a => html`<a class="chip" href="/api/feed/media/${it.id}/${a.i}" target="_blank" rel="noopener noreferrer">${a.name}</a>`)}</div>` : ''}
    ${(it.embeds || []).filter(e => e.title || e.description || e.image).map(e => html`<div class="feed-embed">
      ${e.provider ? html`<small class="muted">${e.provider}</small>` : ''}
      ${e.title ? html`<b>${e.url ? html`<a href="${e.url}" target="_blank" rel="noopener noreferrer nofollow">${e.title}</a>` : e.title}</b>` : ''}
      ${e.description ? html`<div class="feed-text" style="font-size:.9rem">${discordMarkdown(e.description)}</div>` : ''}
      ${e.image ? html`<img src="${e.image}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
    </div>`)}
    ${admin ? html`<div class="hero-actions" style="margin-top:4px">
      ${it.approved ? html`<button class="btn btn-sm" type="button" data-approve="${it.id}" data-on="0">Unpublish</button>` : html`<button class="btn btn-sm btn-primary" type="button" data-approve="${it.id}" data-on="1">${icon('check')} Approve</button>`}
      <button class="btn btn-sm btn-ghost" type="button" data-hide="${it.id}" style="color:var(--bad)">Remove</button></div>` : ''}
  </article>`;
}

function videos(body, data) {
  const vids = data.videos || [];
  const chans = [...new Set(vids.map(v => v.channel).filter(Boolean))];
  let chan = '';
  const draw = () => render(document.getElementById('vgrid'), vids.filter(v => !chan || v.channel === chan).slice(0, 30).map(videoCard));
  render(body, html`
    ${vids.length ? html`
      <div class="filters"><div class="seg" id="vchan"><button type="button" class="on" data-c="">All channels</button>${chans.map(c => html`<button type="button" data-c="${c}">${c}</button>`)}</div>
        <a class="btn btn-sm" href="https://www.youtube.com/@RobertsSpaceInd" target="_blank" rel="noopener noreferrer">Star Citizen on YouTube ${icon('ext', 'i-sm')}</a>
        <a class="btn btn-sm" href="https://www.youtube.com/@Squadron42" target="_blank" rel="noopener noreferrer">Squadron 42 on YouTube ${icon('ext', 'i-sm')}</a></div>
      <div class="cards" id="vgrid"></div>` : html`<p class="muted" style="margin-bottom:12px">The video list isn't reachable right now. Here's where to watch:</p>`}
    <div class="panel" style="margin-top:16px"><h3 style="margin-bottom:8px">More videos to start with</h3><div class="link-list">${LINKS[3][1].map(([t, u, d]) => html`<a href="${u}" target="_blank" rel="noopener noreferrer"><span>${t}<small>${d}</small></span>${icon('ext')}</a>`)}</div></div>`);
  if (vids.length) {
    draw();
    document.getElementById('vchan').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      chan = b.dataset.c;
      document.querySelectorAll('#vchan button').forEach(x => x.classList.toggle('on', x === b));
      draw();
    });
  }
}

function linksTab(body) {
  render(body, html`<div class="grid g3">${LINKS.map(([group, links]) => html`
    <div class="panel"><h3 style="margin-bottom:8px">${group}</h3><div class="link-list">${links.map(([t, u, d]) => html`<a href="${u}" target="_blank" rel="noopener noreferrer"><span>${t}<small>${d}</small></span>${icon('ext')}</a>`)}</div></div>`)}</div>`);
}
