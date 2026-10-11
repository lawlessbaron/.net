import { html, render, icon, load, timeAgo, errorBox } from '../lib.js';

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

export default async function news(main, { meta }) {
  let data;
  try { data = await load('news'); } catch (e) { render(main, errorBox(e)); return; }
  const channels = [...new Set((data.commLinks || []).map(n => n.channel).filter(Boolean))];
  let channel = '';

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Community</span>
      <h1>News, videos & links</h1>
      <p class="lede">The latest official posts from CIG, the community tools everyone uses, and where to find other players.</p>
    </div>
    <div class="stat-row" style="margin-bottom:20px">
      <div class="stat hi"><span>LIVE version</span><b>${data.versions?.live || meta.gameVersion || '—'}</b></div>
      <div class="stat"><span>PTU (test server)</span><b>${data.versions?.ptu || 'Not running'}</b></div>
      <div class="stat"><span>News updated</span><b>${timeAgo(data.updated)}</b></div>
    </div>
    <div class="split">
      <div class="stack">
        <div class="panel">
          <div class="panel-title"><h2>Latest comm-links</h2><a href="https://robertsspaceindustries.com/comm-link" target="_blank" rel="noopener noreferrer">All on RSI ${icon('ext', 'i-sm')}</a></div>
          <div class="seg" id="nchan" style="margin-bottom:6px"><button type="button" class="on" data-c="">All</button>${channels.map(c => html`<button type="button" data-c="${c}">${c}</button>`)}</div>
          <div id="nlist"></div>
        </div>
        ${data.videos?.length ? html`<div class="panel"><h2>Latest videos</h2><div class="cards">${data.videos.slice(0, 9).map(v => html`
          <a class="card" href="${v.link}" target="_blank" rel="noopener noreferrer">
            <div class="card-media">${v.thumb ? html`<img src="${v.thumb}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}</div>
            <div class="card-body"><div class="card-title" style="font-size:.95rem">${v.title}</div><div class="card-sub">${timeAgo(v.date)}</div></div>
          </a>`)}</div></div>` : ''}
        <div class="panel">
          <h2>About leaks and test builds</h2>
          <div class="step-text">
            <p>Upcoming features show up first on the <b>PTU</b> and <b>EPTU</b> test servers, which any backer can join from the RSI Launcher when a wave is open. Their patch notes are public on Spectrum, and that's the safest way to see what's coming.</p>
            <p>Before that, builds go to <b>Evocati</b> testers under NDA. Verse Atlas doesn't publish NDA leaks. Datamined details are better taken with a grain of salt until they reach the PTU, since unfinished content often changes or gets cut.</p>
          </div>
        </div>
      </div>
      <div class="stack">
        ${LINKS.map(([group, links]) => html`
          <div class="panel">
            <h3 style="margin-bottom:8px">${group}</h3>
            <div class="link-list">${links.map(([t, u, d]) => html`<a href="${u}" target="_blank" rel="noopener noreferrer"><span>${t}<small>${d}</small></span>${icon('ext')}</a>`)}</div>
          </div>`)}
      </div>
    </div>
  `);
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
