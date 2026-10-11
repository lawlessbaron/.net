import { html, render, icon, load, usd, timeAgo, img, errorBox } from '../lib.js';
import { events, tips } from '../content/events.js';
import { skuKind } from './pledge.js';

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EVENT_WORDS = /\b(sale|free fly|free-fly|event|festival|expo|iae|invictus|citizencon|luminalia|coramor|stella fortuna|red festival|day of the vara|anniversary|limited|showdown|week|concierge|giveaway|twitchcon|bar ?citizen)\b/i;

// Resolves an event to concrete dates for a given year, preferring announced dates.
function datesFor(ev, year) {
  const known = ev.dates?.[year];
  if (known) return { start: new Date(known.start + 'T00:00:00Z'), end: new Date(known.end + 'T23:59:59Z'), status: known.status, note: known.note, source: known.source };
  const [[m1, d1], [m2, d2]] = ev.window;
  const start = new Date(Date.UTC(year, m1 - 1, d1));
  const end = new Date(Date.UTC(m2 < m1 ? year + 1 : year, m2 - 1, d2, 23, 59, 59));
  return { start, end, status: 'Usually', typical: true };
}

export default async function eventsPage(main) {
  let news = { commLinks: [] }, ships = [];
  try { [news, ships] = await Promise.all([load('news').catch(() => ({ commLinks: [] })), load('ships')]); } catch (e) { render(main, errorBox(e)); return; }
  const now = new Date();
  const year = now.getUTCFullYear();
  const upcoming = events.flatMap(ev => [year - 1, year, year + 1].map(y => ({ ev, ...datesFor(ev, y) })))
    .filter(x => x.end >= now)
    .sort((a, b) => a.start - b.start);
  const live = upcoming.filter(x => x.start <= now && x.status !== 'Took place');
  const next = upcoming.filter(x => x.start > now).slice(0, 6);
  const announcements = (news.commLinks || []).filter(n => EVENT_WORDS.test(n.title)).slice(0, 10);
  const onSale = ships.flatMap(s => (s.skus || []).filter(k => k.avail && k.sale).map(k => ({ s, k })));
  const warbonds = ships.flatMap(s => (s.skus || []).filter(k => k.avail && k.warbond).map(k => ({ s, k }))).sort((a, b) => a.k.price - b.k.price);
  const limitedNow = ships.filter(s => (s.skus || []).some(k => k.avail && !k.pkg && skuKind(k) === 'Standalone ship') && !s.buy?.length && s.msrp).sort((a, b) => b.msrp - a.msrp).slice(0, 12);
  const countdown = next[0];

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Calendar</span>
      <h1>Events & sales</h1>
      <p class="lede">In-game festivals, Free Fly weekends, and ship sales across the year, with what's on the pledge store right now. CIG announces exact dates only shortly before each event, so we show the usual window until dates are announced.</p>
    </div>

    ${countdown ? html`
    <section class="hero" style="grid-template-columns:minmax(0,1fr) auto;margin-bottom:20px">
      <div class="hero-copy">
        <span class="eyebrow">${live.length ? `Live now: ${live.map(l => l.ev.name).join(', ')} · ` : ''}Next up</span>
        <h2 style="font-size:clamp(1.6rem,1.2rem+1.5vw,2.4rem)">${countdown.ev.name}</h2>
        <p class="lede">${countdown.ev.summary}</p>
        <div class="chips">${countdown.ev.kind.map(k => html`<span class="chip ${k === 'Free Fly' ? 'chip-live' : k === 'Sale' ? 'chip-accent' : ''}">${k}</span>`)}
          <span class="chip ${countdown.typical ? 'chip-warn' : ''}">${countdown.typical ? 'Usual timing, not yet announced' : countdown.status}</span></div>
      </div>
      <div class="countdown" id="countdown" data-t="${countdown.start.toISOString()}"></div>
    </section>` : ''}

    <section class="panel" style="margin-bottom:20px">
      <div class="panel-title"><h2>The year at a glance</h2><span class="muted" style="font-size:.85rem">Bars show when each event usually runs. The line is today.</span></div>
      ${yearChart(year, now)}
    </section>

    <div class="split">
      <div class="stack">
        <div class="panel">
          <h2>Coming up</h2>
          <div class="rows" style="margin-top:12px">${next.map(x => html`
            <div class="row" style="grid-template-columns:76px minmax(0,1fr) auto">
              <span class="date-chip"><b>${x.start.getUTCDate()}</b><span>${MONTHS[x.start.getUTCMonth()]}</span></span>
              <span style="display:grid;gap:4px;min-width:0">
                <span class="row-title">${x.ev.name}</span>
                <span class="row-meta">${x.ev.kind.map(k => html`<span class="chip">${k}</span>`)}<span>${fmtRange(x.start, x.end)}</span></span>
                ${x.note ? html`<span class="muted" style="font-size:.85rem">${x.note}</span>` : ''}
              </span>
              <span class="row-side"><span class="chip ${x.typical ? 'chip-warn' : 'chip-live'}">${x.typical ? 'Usual window' : x.status}</span>
                ${x.source ? html`<a href="${x.source}" target="_blank" rel="noopener noreferrer" style="font-size:.8rem">Source</a>` : ''}</span>
            </div>`)}</div>
        </div>

        <div class="panel">
          <div class="panel-title"><h2>Event & sale announcements</h2><a href="#/news">All news ${icon('arrow', 'i-sm')}</a></div>
          ${announcements.length ? announcements.map(n => html`<div class="news-item"><div class="chips">${n.channel ? html`<span class="chip">${n.channel}</span>` : ''}<span class="chip">${timeAgo(n.date)}</span></div><h3><a href="${n.link}" target="_blank" rel="noopener noreferrer">${n.title}</a></h3>${n.summary ? html`<p>${n.summary.slice(0, 200)}…</p>` : ''}</div>`)
            : html`<p class="muted">No event or sale posts in the latest comm-links.</p>`}
        </div>

        <div class="panel">
          <div class="panel-title"><h2>Pledge-only ships on the store now</h2><a href="#/pledge">All prices ${icon('arrow', 'i-sm')}</a></div>
          <p class="muted" style="margin-bottom:12px">Can't be bought with aUEC in game right now. Some rotate off the store after an event.</p>
          <div class="cards">${limitedNow.map(s => html`
            <a class="card" href="#/ships/${s.id}"><div class="card-media">${img(s.img, s.name)}</div>
            <div class="card-body"><div class="card-title">${s.name}</div><div class="card-sub">${s.maker || ''}</div><div class="card-stats"><span><b>${usd(s.msrp)}</b>pledge</span><span><b>${s.status === 'flight-ready' ? 'Yes' : 'No'}</b>flyable</span><span><b>${s.cargo ?? '—'}</b>SCU</span></div></div></a>`)}</div>
        </div>
      </div>
      <div class="stack">
        <div class="panel">
          <h3 style="margin-bottom:8px">Discounted right now</h3>
          ${onSale.length ? html`<div class="link-list">${onSale.map(({ s, k }) => html`<a href="${k.url}" target="_blank" rel="noopener noreferrer"><span>${s.name}<small><s>${usd(k.price)}</s> ${usd(k.sale)} · ${skuKind(k)}</small></span>${icon('ext')}</a>`)}</div>` : html`<p class="muted" style="font-size:.9rem">No discounted listings in the latest store data.</p>`}
        </div>
        <div class="panel">
          <h3 style="margin-bottom:8px">Warbond deals available</h3>
          ${warbonds.length ? html`<div class="link-list">${warbonds.slice(0, 15).map(({ s, k }) => html`<a href="${k.url}" target="_blank" rel="noopener noreferrer"><span>${k.title.trim()}<small>${usd(k.price)} · ${skuKind(k)}</small></span>${icon('ext')}</a>`)}</div>` : html`<p class="muted" style="font-size:.9rem">No warbond listings on the store right now. They usually appear for new ship launches and during IAE.</p>`}
        </div>
        <div class="panel">
          <h3 style="margin-bottom:8px">Good to know</h3>
          <ul class="step-text" style="padding-left:1.1em">${tips.map(t => html`<li>${t}</li>`)}</ul>
        </div>
      </div>
    </div>
  `);
  startCountdown();
}

const fmtRange = (a, b) => `${MONTHS[a.getUTCMonth()]} ${a.getUTCDate()} – ${MONTHS[b.getUTCMonth()]} ${b.getUTCDate()}`;

function yearChart(year, now) {
  const W = 1000, rowH = 26, top = 30, left = 170;
  const x = d => left + ((d - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1))) * (W - left - 10);
  const H = top + events.length * rowH + 10;
  const kindColor = ev => ev.kind.includes('Free Fly') ? 'var(--good)' : ev.kind.includes('Convention') ? 'var(--nyx)' : 'var(--accent)';
  return html`<div class="table-wrap" style="border:0;background:none"><svg viewBox="0 0 ${W} ${H}" style="min-width:640px;width:100%;display:block" role="img" aria-label="Star Citizen event calendar for ${year}">
    ${MONTHS.map((m, i) => { const mx = x(Date.UTC(year, i, 1)); return html`<line x1="${mx}" x2="${mx}" y1="${top - 8}" y2="${H}" stroke="var(--line)" stroke-width="1"/><text x="${mx + 4}" y="${top - 12}" fill="var(--muted)" style="font:500 11px var(--mono)">${m}</text>`; })}
    ${events.map((ev, i) => {
      const y = top + i * rowH;
      const d = datesFor(ev, year);
      const segs = d.end.getUTCFullYear() > year ? [[d.start, new Date(Date.UTC(year, 11, 31))], [new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, d.end.getUTCMonth(), d.end.getUTCDate()))]] : [[d.start, d.end]];
      return html`<text x="0" y="${y + 16}" fill="var(--fg)" style="font:500 12px var(--body)">${ev.name.replace(/ \(IAE\)/, '')}</text>
        ${segs.map(([a, b]) => html`<rect x="${x(a)}" y="${y + 5}" width="${Math.max(6, x(b) - x(a))}" height="${rowH - 10}" rx="3" fill="${kindColor(ev)}" opacity="${d.typical ? 0.45 : 0.9}"><title>${ev.name}: ${fmtRange(d.start, d.end)} (${d.typical ? 'usual window' : d.status})</title></rect>`)}`;
    })}
    <line x1="${x(now.getTime())}" x2="${x(now.getTime())}" y1="${top - 8}" y2="${H}" stroke="var(--bad)" stroke-width="2"/>
    <text x="${x(now.getTime()) + 4}" y="${H - 4}" fill="var(--bad)" style="font:600 11px var(--mono)">TODAY</text>
  </svg></div>
  <div class="legend" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px"><div><span style="background:var(--good)"></span>Free Fly</div><div><span style="background:var(--accent)"></span>Event / sale</div><div><span style="background:var(--nyx)"></span>Convention</div><div class="muted">Faded bars are the usual window; solid bars are announced or reported dates.</div></div>`;
}

function startCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  const t = new Date(el.dataset.t).getTime();
  const tick = () => {
    if (!el.isConnected) return;
    let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60);
    el.innerHTML = [[d, 'days'], [h, 'hrs'], [m, 'min']].map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
    setTimeout(tick, 30000);
  };
  tick();
}
void DAY;
