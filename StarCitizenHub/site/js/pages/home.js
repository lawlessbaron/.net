import { html, render, icon, load, fmt, shortAuec, timeAgo, img, errorBox, referralCard } from '../lib.js';
import { missionRow } from './missions.js';
import { events } from '../content/events.js';

export default async function home(main, { meta }) {
  const c = meta.counts || {};
  let missions = [], ships = [], news = { commLinks: [] }, guide = { guideChapters: [] };
  try {
    [missions, ships, news, guide] = await Promise.all([
      load('missions'), load('ships'), load('news').catch(() => ({ commLinks: [] })),
      import('../content/guide.js').catch(() => ({ guideChapters: [] })),
    ]);
  } catch (e) { render(main, errorBox(e)); return; }

  const starter = missions
    .filter(m => !m.illegal && (!m.minStanding || m.minStanding.rep <= 0) && m.reward?.[0] > 0 && !m.prereq && (m.systems || []).includes('Stanton')
      && /Hauling|Delivery|Bounty|Salvage|Mining|Investigation/.test(`${m.category} ${m.type}`))
    .sort((a, b) => (b.repGain?.[0]?.amount || 0) - (a.repGain?.[0]?.amount || 0) || a.reward[0] - b.reward[0])
    .slice(0, 6);
  const cheapShips = ships.filter(s => s.buy?.length && !s.ground).sort((a, b) => a.buy[0].price - b.buy[0].price).slice(0, 6);
  const chapters = guide.guideChapters || [];
  // Fleet-chart banner: side views of real ships, widths proportional to length.
  const PICK = ['Pisces', 'Arrow', 'Avenger Titan', 'Gladius', 'Cutlass Black', 'Prospector', 'Vulture', 'Constellation Andromeda', 'Freelancer', 'Corsair', 'Caterpillar', 'Carrack', 'Hammerhead', 'C2 Hercules Starlifter', 'Reclaimer', '890 Jump', 'Polaris', 'Idris-P', 'Javelin'];
  const chart = PICK.map(n => ships.find(s => s.side && s.length && (s.name === n || s.name.endsWith(' ' + n)))).filter(Boolean)
    .sort((a, b) => (a.length || 0) - (b.length || 0));
  const now = new Date();
  const nextEvent = events.map(ev => {
    const d = ev.dates?.[now.getFullYear()];
    const start = d ? new Date(d.start) : new Date(Date.UTC(now.getFullYear(), ev.window[0][0] - 1, ev.window[0][1]));
    return { ev, start, typical: !d };
  }).filter(x => x.start > now).sort((a, b) => a.start - b.start)[0];

  render(main, html`
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Star Citizen ${meta.gameVersion || ''} field guide</span>
        <h1>Everything you need to <em>survive the 'verse</em>, in one place.</h1>
        <p class="lede">Step-by-step help for your very first launch, every mission and who gives it, how much reputation it pays, every ship and where to buy it, and every shop that sells the gear to keep you alive.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/guide">${icon('book')} Start the new player guide</a>
          <a class="btn" href="#/missions">${icon('target')} Find a mission</a>
          <a class="btn btn-ghost" href="#/fleet">${icon('hangar')} Link your account</a>
        </div>
      </div>
      <div class="hero-radar"><canvas id="radar" width="680" height="680" aria-label="Animated scanner showing the Stanton, Pyro and Nyx systems" role="img"></canvas></div>
    </section>

    <section style="margin-bottom:28px">${referralCard()}</section>

    ${chart.length ? html`
    <section style="margin-bottom:28px">
      <div class="panel-title"><h2>Every ship, to scale</h2><a href="#/ships">Browse all ${fmt(ships.length)} ${icon('arrow', 'i-sm')}</a></div>
      <div class="fleetchart"><div class="fleetchart-row">
        ${chart.map(s => html`<a class="fc-ship" href="#/ships/${s.id}"><img src="${s.side}" alt="${s.name}" loading="lazy" crossorigin="anonymous" style="width:${Math.max(70, Math.round(s.length * 5.2))}px"><span>${s.name}</span><small>${fmt(s.length, 0)} m</small></a>`)}
      </div></div>
    </section>` : ''}

    ${nextEvent ? html`
    <a class="tile" href="#/events" style="margin-bottom:28px;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;display:grid;gap:16px">
      <span class="date-chip"><b>${nextEvent.start.getUTCDate()}</b><span>${nextEvent.start.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}</span></span>
      <span style="display:grid;gap:4px;min-width:0"><span class="eyebrow">Next event${nextEvent.typical ? ' · usual timing' : ''}</span><h3>${nextEvent.ev.name}</h3><p>${nextEvent.ev.summary}</p></span>
      <span class="chips">${nextEvent.ev.kind.map(k => html`<span class="chip ${k === 'Free Fly' ? 'chip-live' : ''}">${k}</span>`)}</span>
    </a>` : ''}

    <section class="stack" style="margin-bottom:28px">
      <div class="panel-title"><h2>Your first hour, in order</h2><a href="#/guide">Full guide ${icon('arrow', 'i-sm')}</a></div>
      <div class="chapters">
        ${chapters.slice(0, 5).map((ch, i) => html`
          <a class="chapter-link" href="#/guide/${ch.id}">
            <span class="n">${String(i + 1).padStart(2, '0')}</span>
            <span><b>${ch.title}</b><small>${ch.summary}</small></span>
            <span class="chip">${ch.minutes || 5} min</span>
          </a>`)}
      </div>
    </section>

    <section style="margin-bottom:28px">
      <div class="tiles">
        ${tile('#/missions', 'target', 'Missions', `${fmt(c.missions)} contracts with pay, required rank and rep gained`)}
        ${tile('#/factions', 'users', 'Mission givers', `${fmt(c.factions)} factions with full reputation ladders`)}
        ${tile('#/ships', 'ship', 'Ships & vehicles', `${fmt(c.ships)} ships and variants, prices and where to buy or rent`)}
        ${tile('#/items', 'crosshair', 'Weapons & gear', `${fmt(c.items)} weapons, armor, components, food and meds`)}
        ${tile('#/locations', 'map', 'Locations & shops', `${fmt(c.locations)} places and what you can buy at each`)}
        ${tile('#/fleet', 'hangar', 'My fleet', 'Link your RSI handle and see your ships to scale')}
      </div>
    </section>

    <section class="grid g2" style="margin-bottom:28px">
      <div class="panel">
        <div class="panel-title"><h2>Good first contracts</h2><a href="#/missions?rank=0&legal=1">More ${icon('arrow', 'i-sm')}</a></div>
        <p class="muted" style="margin-bottom:12px">Legal, no reputation needed, available in Stanton where most new players start.</p>
        <div class="rows">${starter.map(missionRow)}</div>
      </div>
      <div class="panel">
        <div class="panel-title"><h2>Cheapest ships to buy in game</h2><a href="#/ships?sort=price&buyable=1">All ships ${icon('arrow', 'i-sm')}</a></div>
        <p class="muted" style="margin-bottom:12px">Bought with aUEC you earn in game. Lowest known price shown.</p>
        <div class="rows">${cheapShips.map(s => html`
          <a class="row" href="#/ships/${s.id}" style="grid-template-columns:64px minmax(0,1fr) auto">
            <span class="thumb">${img(s.img, s.name)}</span>
            <span><span class="row-title">${s.name}</span><span class="row-meta"><span>${s.maker}</span><span>${s.role || s.career || ''}</span></span></span>
            <span class="row-side"><span class="pay">${shortAuec(s.buy[0].price)}</span><span class="muted" style="font-size:.8rem">${s.buy[0].place || ''}</span></span>
          </a>`)}</div>
      </div>
    </section>

    ${news.commLinks?.length ? html`
    <section class="panel">
      <div class="panel-title"><h2>Latest from RSI</h2><a href="#/news">News & community ${icon('arrow', 'i-sm')}</a></div>
      ${news.commLinks.slice(0, 5).map(n => html`
        <div class="news-item">
          <div class="chips">${n.channel ? html`<span class="chip">${n.channel}</span>` : ''}<span class="chip">${timeAgo(n.date)}</span></div>
          <h3><a href="${n.link}" target="_blank" rel="noopener noreferrer">${n.title}</a></h3>
        </div>`)}
    </section>` : ''}
  `);
  radar(document.getElementById('radar'));
}

const tile = (href, ic, title, text) => html`
  <a class="tile" href="${href}"><span class="tile-head">${icon(ic)}<h3>${title}</h3></span><p>${text}</p></a>`;

// Hero scanner: a slow radar sweep with the three systems as blips.
function radar(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, R = W / 2 - 14;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const blips = [
    { name: 'STANTON', a: -0.6, r: 0.38, c: '--stanton' },
    { name: 'PYRO', a: 2.2, r: 0.7, c: '--pyro' },
    { name: 'NYX', a: 4.1, r: 0.6, c: '--nyx' },
  ];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t0 = performance.now();
  function frame(now) {
    if (!canvas.isConnected) return;
    const ang = reduce ? 0.9 : ((now - t0) / 4200) * Math.PI * 2;
    const line = css('--line'), acc = css('--accent'), mut = css('--muted');
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(W / 2, W / 2);
    ctx.strokeStyle = line; ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(0, 0, (R * i) / 4, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
    }
    // sweep
    const grad = ctx.createConicGradient ? ctx.createConicGradient(ang - 0.9, 0, 0) : null;
    if (grad) {
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.14, acc + '55');
      grad.addColorStop(0.145, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = acc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R); ctx.stroke();
    // blips fade after the sweep passes
    ctx.font = '600 22px "Chakra Petch", sans-serif';
    ctx.textBaseline = 'middle';
    for (const b of blips) {
      const x = Math.cos(b.a) * R * b.r, y = Math.sin(b.a) * R * b.r;
      let d = ((ang - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const glow = reduce ? 1 : Math.max(0.35, 1 - d / (Math.PI * 1.6));
      const col = css(b.c);
      ctx.globalAlpha = glow;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 18 + (1 - glow) * 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = css('--fg');
      ctx.fillText(b.name, x + 26, y);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = mut;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
