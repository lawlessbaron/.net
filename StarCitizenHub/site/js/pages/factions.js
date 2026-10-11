import { html, render, icon, load, lookups, fmt, norm, store, errorBox } from '../lib.js';
import { missionRow, payText } from './missions.js';

const repStore = () => store.get('rep', {});

export default async function factions(main, ctx) {
  let L, missions;
  try { [L, missions] = await Promise.all([lookups(), load('missions')]); } catch (e) { render(main, errorBox(e)); return; }
  if (ctx.id) return detail(main, ctx.id, L, missions);

  const reps = repStore();
  let q = '', kind = '';
  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Reputation</span>
      <h1>Mission givers & factions</h1>
      <p class="lede">Each faction has a reputation ladder. Doing their contracts raises your standing, and higher ranks unlock better-paying work. Open a faction to see every rank, what it unlocks, and the fastest missions to climb.</p>
    </div>
    <div class="filters">
      <div class="field field-grow"><label for="fq">Search</label><input id="fq" type="search" placeholder="Faction or mission giver name"></div>
      <div class="field"><span class="lbl">Show</span><div class="seg" id="fkind"><button type="button" class="on" data-k="">All</button><button type="button" data-k="Lawful">Lawful</button><button type="button" data-k="Unlawful">Unlawful</button></div></div>
    </div>
    <div class="cards" id="fcards"></div>
  `);
  const draw = () => {
    const list = L.factions.filter(f => (!kind || f.type === kind) && (!q || norm(`${f.name} ${(f.givers || []).join(' ')} ${f.focus}`).includes(norm(q))));
    render(document.getElementById('fcards'), list.map(f => {
      const r = reps[f.id];
      const rank = r !== undefined ? rankFor(f, r) : null;
      return html`
      <a class="card" href="#/factions/${f.id}">
        <div class="card-body">
          <div class="chips">
            ${f.type ? html`<span class="chip ${f.type === 'Unlawful' ? 'chip-illegal' : 'chip-legal'}">${f.type}</span>` : ''}
            ${f.focus ? html`<span class="chip">${f.focus}</span>` : ''}
          </div>
          <div class="card-title">${f.name}</div>
          <div class="card-sub">${f.hq || f.area || ''}</div>
          ${f.givers?.length && !(f.givers.length === 1 && f.givers[0] === f.name) ? html`<div class="card-sub">Givers: ${f.givers.filter(g => g !== f.name).slice(0, 4).join(', ')}</div>` : ''}
          <div class="card-stats">
            <span><b>${fmt(f.missions)}</b>missions</span>
            <span><b>${f.ladder ? f.ladder.standings.filter(s => s.min >= 0).length : '—'}</b>ranks</span>
            <span><b>${rank ? rank.name : '—'}</b>your rank</span>
          </div>
        </div>
      </a>`;
    }));
  };
  document.getElementById('fq').addEventListener('input', e => { q = e.target.value; draw(); });
  document.getElementById('fkind').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    kind = b.dataset.k;
    document.querySelectorAll('#fkind button').forEach(x => x.classList.toggle('on', x === b));
    draw();
  });
  draw();
  void missions;
}

export function rankFor(f, rep) {
  const st = (f.ladder?.standings || []).filter(s => s.min >= 0 || rep < 0);
  let cur = null;
  for (const s of st) if (rep >= s.min) cur = s;
  if (rep < 0) cur = (f.ladder?.standings || []).find(s => s.min < 0) || cur;
  return cur;
}

function detail(main, id, L, missions) {
  const f = L.factionById.get(id);
  if (!f) { render(main, html`<div class="empty"><h2>Faction not found</h2><p><a href="#/factions">All factions</a></p></div>`); return; }
  const own = missions.filter(m => m.factionId === f.id || (m.repGain || []).some(r => r.factionId === f.id));
  const ladder = (f.ladder?.standings || []).filter(s => s.min >= 0);

  const draw = () => {
    const reps = repStore();
    const mine = reps[f.id];
    const cur = mine !== undefined ? rankFor(f, mine) : null;
    const nextRank = mine !== undefined ? ladder.find(s => s.min > mine) : null;
    // Missions you can take now, ranked by rep per run.
    const available = mine === undefined ? [] : own
      .filter(m => (m.minStanding?.rep || 0) <= mine && (!m.maxStanding || m.maxStanding.rep > mine || m.maxStanding.rep >= (f.ladder?.ceiling || 0)))
      .filter(m => (m.repGain || []).some(r => r.factionId === f.id && r.amount > 0))
      .sort((a, b) => gain(b, f) - gain(a, f));
    const best = available[0];
    const toGo = nextRank ? nextRank.min - mine : 0;

    render(main, html`
      <div class="crumbs"><a href="#/factions">Mission givers</a> / ${f.name}</div>
      <div class="page-head">
        <span class="eyebrow">${[f.type, f.focus].filter(Boolean).join(' · ') || 'Faction'}</span>
        <h1>${f.name}</h1>
        ${f.description ? html`<p class="lede">${f.description}</p>` : ''}
      </div>
      <div class="split">
        <div class="stack">
          <div class="panel">
            <div class="panel-title"><h2>Your standing</h2>${cur ? html`<span class="chip chip-accent">${cur.name}</span>` : ''}</div>
            <div class="filters" style="margin-bottom:12px">
              <div class="field"><label for="myrep">Your reputation with ${f.name}</label><input id="myrep" type="number" min="-100000" max="${f.ladder?.ceiling || 1000000}" step="50" placeholder="e.g. 1200" value="${mine ?? ''}" style="width:200px"></div>
              <button class="btn" id="saverep" type="button">Save</button>
              ${mine !== undefined ? html`<button class="btn btn-ghost" id="clearrep" type="button">Clear</button>` : ''}
            </div>
            <p class="muted" style="font-size:.9rem">Find this in game: mobiGlas → <b>Reputation</b>, then pick ${f.name}. The bar shows your points. Saved only in this browser.</p>
            ${mine !== undefined && nextRank ? html`
              <div style="margin-top:14px;display:grid;gap:6px">
                <div class="prog"><i style="width:${Math.min(100, ((mine - (cur?.min || 0)) / Math.max(1, nextRank.min - (cur?.min || 0))) * 100)}%"></i></div>
                <span class="mono" style="font-size:.88rem">${fmt(toGo)} rep to <b>${nextRank.name}</b></span>
              </div>
              ${best ? html`<p class="callout callout-tip" style="margin-top:12px">${icon('bolt')}<span>Fastest climb right now: <a href="#/missions/${best.id}">${best.title}</a> gives <b class="mono">+${fmt(gain(best, f))}</b> rep. About <b class="mono">${fmt(Math.ceil(toGo / gain(best, f)))}</b> runs to rank up.</span></p>` : ''}
            ` : mine !== undefined ? html`<p class="callout callout-tip" style="margin-top:12px">${icon('star')}<span>You're at the top of this ladder.</span></p>` : ''}
          </div>

          ${ladder.length ? html`
          <div class="panel">
            <h2>Rank ladder</h2>
            <div class="ladder">
              ${ladder.map(s => {
                const count = own.filter(m => (m.minStanding?.rep || 0) === s.min && m.factionId === f.id).length;
                return html`<div class="rung ${mine !== undefined && mine >= s.min ? 'reached' : ''} ${cur && cur.name === s.name ? 'current' : ''}">
                  <span class="dot"></span><span><b>${s.name}</b>${count ? html` <span class="muted" style="font-size:.85rem">· unlocks ${count} mission${count > 1 ? 's' : ''}</span>` : ''}</span><span class="mono">${fmt(s.min)}</span></div>`;
              })}
            </div>
          </div>` : ''}

          <div class="panel">
            <div class="panel-title"><h2>Missions (${fmt(own.length)})</h2><a href="#/missions?giver=${encodeURIComponent(f.givers?.[0] || f.name)}">Filter in mission list ${icon('arrow', 'i-sm')}</a></div>
            ${groupByRank(own, f).map(([name, list]) => html`
              <h3 style="margin:16px 0 8px">${name} <span class="muted mono" style="font-size:.8rem">${list.length}</span></h3>
              <div class="rows">${list.slice(0, 30).map(missionRow)}</div>
              ${list.length > 30 ? html`<p class="muted" style="margin-top:6px">+${list.length - 30} more in the mission list.</p>` : ''}`)}
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <h2>About</h2>
            <dl class="kv">
              ${f.type ? html`<dt>Alignment</dt><dd>${f.type}</dd>` : ''}
              ${f.hq ? html`<dt>Headquarters</dt><dd>${f.hq}</dd>` : ''}
              ${f.area ? html`<dt>Operates in</dt><dd>${f.area}</dd>` : ''}
              ${f.focus ? html`<dt>Focus</dt><dd>${f.focus}</dd>` : ''}
              ${f.leadership ? html`<dt>Leadership</dt><dd>${f.leadership}</dd>` : ''}
              ${f.founded ? html`<dt>Founded</dt><dd>${f.founded}</dd>` : ''}
              ${f.reaction ? html`<dt>Default attitude</dt><dd>${f.reaction}</dd>` : ''}
              ${f.ladder?.ceiling ? html`<dt>Max reputation</dt><dd class="mono">${fmt(f.ladder.ceiling)}</dd>` : ''}
            </dl>
          </div>
          ${f.givers?.length ? html`<div class="panel"><h3 style="margin-bottom:8px">Mission givers</h3><div class="link-list">${f.givers.map(g => html`<a href="#/missions?giver=${encodeURIComponent(g)}"><span>${g}</span>${icon('arrow')}</a>`)}</div></div>` : ''}
          ${available.length ? html`<div class="panel"><h3 style="margin-bottom:8px">Best rep at your rank</h3><div class="link-list">${available.slice(0, 8).map(m => html`<a href="#/missions/${m.id}"><span>${m.title}<small>+${fmt(gain(m, f))} rep · ${payText(m)}</small></span>${icon('arrow')}</a>`)}</div></div>` : ''}
        </div>
      </div>
    `);
    const input = document.getElementById('myrep');
    const save = () => {
      const v = input.value.trim();
      const all = repStore();
      if (v === '' || Number.isNaN(+v)) delete all[f.id]; else all[f.id] = Math.round(+v);
      store.set('rep', all);
      draw();
    };
    document.getElementById('saverep').addEventListener('click', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    document.getElementById('clearrep')?.addEventListener('click', () => { const all = repStore(); delete all[f.id]; store.set('rep', all); draw(); });
  };
  draw();
}

const gain = (m, f) => (m.repGain || []).filter(r => r.factionId === f.id).reduce((n, r) => n + (r.amount || 0), 0) || m.repGain?.[0]?.amount || 0;

function groupByRank(list, f) {
  const groups = new Map();
  const sorted = [...list].sort((a, b) => (a.minStanding?.rep || 0) - (b.minStanding?.rep || 0) || a.title.localeCompare(b.title));
  for (const m of sorted) {
    const key = m.minStanding?.rep > 0 ? `${m.minStanding.name} (${fmt(m.minStanding.rep)}+)` : 'No rank needed';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  void f;
  return [...groups.entries()];
}
