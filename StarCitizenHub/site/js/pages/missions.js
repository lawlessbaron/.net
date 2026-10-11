import { html, raw, render, icon, load, lookups, fmt, auec, norm, esc, store, errorBox, systemClass, ext } from '../lib.js';

const PAGE = 50;
const RANKS = [
  ['', 'Any rank'],
  ['0', 'No reputation needed'],
  ['800', 'Up to Jr. Contractor (800)'],
  ['2200', 'Up to Contractor (2,200)'],
  ['5800', 'Up to Sr. Contractor (5,800)'],
  ['15000', 'Up to Veteran (15,000)'],
  ['38000', 'Up to Head Contractor (38,000)'],
];
const SORTS = [['pay', 'Highest pay'], ['rep', 'Most reputation'], ['rank', 'Lowest rank first'], ['title', 'A–Z']];

export const payText = m => {
  if (!m.reward) return m.currency ? m.currency : 'Varies';
  const [a, b] = m.reward;
  const unit = m.currency || 'aUEC';
  if (b && b > a) return `${fmt(a)}–${fmt(b)} ${unit}`;
  return `${fmt(a || b)} ${unit}`;
};
const repText = m => {
  const g = (m.repGain || []).filter(r => r.amount > 0);
  if (!g.length) return null;
  return `+${fmt(g[0].amount)} rep`;
};
const tokenize = s => raw(esc(s).replace(/‹([^›]+)›/g, '<span class="tok">‹$1›</span>'));
export const myRep = () => store.get('rep', {});

export function missionRow(m) {
  const rep = repText(m);
  return html`
    <a class="row" href="#/missions/${m.id}">
      <span style="display:grid;gap:5px;min-width:0">
        <span class="row-title">${tokenize(m.title)}</span>
        <span class="row-meta">
          <span>${m.giver || 'Unknown giver'}</span>
          ${m.category ? html`<span class="chip">${m.category}</span>` : ''}
          ${(m.systems || []).map(s => html`<span class="chip ${systemClass(s)}">${s}</span>`)}
          ${m.illegal ? html`<span class="chip chip-illegal">Illegal</span>` : ''}
          ${m.minStanding && m.minStanding.rep > 0 ? html`<span class="chip chip-warn">${m.minStanding.name}</span>` : ''}
        </span>
      </span>
      <span class="row-side">
        <span class="pay">${payText(m)}</span>
        ${rep ? html`<span class="rep">${rep}</span>` : ''}
      </span>
    </a>`;
}

export default async function missions(main, ctx) {
  if (ctx.id) return detail(main, ctx.id);
  let all, L;
  try { [all, L] = await Promise.all([load('missions'), lookups()]); } catch (e) { render(main, errorBox(e)); return; }

  const p = ctx.params;
  const state = {
    q: p.q || '', cat: p.cat || '', giver: p.giver || '', system: p.system || '', legal: p.legal ?? '',
    rank: p.rank ?? '', share: p.share === '1', combat: p.combat || '', sort: p.sort || 'pay', count: PAGE,
  };
  const cats = [...new Set(all.map(m => m.category).filter(Boolean))].sort();
  const systems = [...new Set(all.flatMap(m => m.systems || []))].sort();
  const givers = [...new Set(all.map(m => m.giver).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Contracts database</span>
      <h1>Missions</h1>
      <p class="lede">Every contract currently in the game: who offers it, what it pays, what reputation rank you need, and how much rep you earn. Click any mission for the full briefing.</p>
    </div>
    <div class="filters">
      <div class="field field-grow"><label for="mq">Search</label><input id="mq" type="search" placeholder="Mission name, giver, cargo…" value="${state.q}"></div>
      <div class="field"><label for="mgiver">Mission giver</label><select id="mgiver"><option value="">All givers</option>${givers.map(g => html`<option ${g === state.giver ? 'selected' : ''}>${g}</option>`)}</select></div>
      <div class="field"><label for="mcat">Type</label><select id="mcat"><option value="">All types</option>${cats.map(c => html`<option ${c === state.cat ? 'selected' : ''}>${c}</option>`)}</select></div>
      <div class="field"><label for="msys">System</label><select id="msys"><option value="">All systems</option>${systems.map(s => html`<option ${s === state.system ? 'selected' : ''}>${s}</option>`)}</select></div>
      <div class="field"><label for="mrank">Required rank</label><select id="mrank">${RANKS.map(([v, l]) => html`<option value="${v}" ${v === state.rank ? 'selected' : ''}>${l}</option>`)}</select></div>
      <div class="field"><label for="mlegal">Legality</label><select id="mlegal"><option value="">Legal & illegal</option><option value="1" ${state.legal === '1' ? 'selected' : ''}>Legal only</option><option value="0" ${state.legal === '0' ? 'selected' : ''}>Illegal only</option></select></div>
      <div class="field"><label for="mcombat">Combat</label><select id="mcombat"><option value="">Any</option><option value="0" ${state.combat === '0' ? 'selected' : ''}>No combat</option><option value="1" ${state.combat === '1' ? 'selected' : ''}>Has combat</option></select></div>
      <div class="field"><label for="msort">Sort</label><select id="msort">${SORTS.map(([v, l]) => html`<option value="${v}" ${v === state.sort ? 'selected' : ''}>${l}</option>`)}</select></div>
      <label class="check"><input type="checkbox" id="mshare" ${state.share ? 'checked' : ''}> Shareable with party</label>
    </div>
    <div class="result-count" id="mcount"></div>
    <div class="rows" id="mrows"></div>
    <div class="more" id="mmore"></div>
  `);

  const $ = id => document.getElementById(id);
  function apply() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    let list = all.filter(m => {
      if (state.cat && m.category !== state.cat) return false;
      if (state.giver && m.giver !== state.giver) return false;
      if (state.system && !(m.systems || []).includes(state.system)) return false;
      if (state.legal === '1' && m.illegal) return false;
      if (state.legal === '0' && !m.illegal) return false;
      if (state.rank !== '' && (m.minStanding?.rep || 0) > +state.rank) return false;
      if (state.share && !m.shareable) return false;
      if (state.combat === '1' && !m.combat) return false;
      if (state.combat === '0' && m.combat) return false;
      if (q.length) {
        const hay = norm(`${m.title} ${m.giver} ${m.category} ${m.type} ${(m.hauling || []).map(h => h.name).join(' ')}`);
        if (!q.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const pay = m => Math.max(m.reward?.[0] || 0, m.reward?.[1] || 0);
    const rep = m => m.repGain?.[0]?.amount || 0;
    const sorters = {
      pay: (a, b) => pay(b) - pay(a),
      rep: (a, b) => rep(b) - rep(a),
      rank: (a, b) => (a.minStanding?.rep || 0) - (b.minStanding?.rep || 0) || pay(b) - pay(a),
      title: (a, b) => a.title.localeCompare(b.title),
    };
    list.sort(sorters[state.sort] || sorters.pay);
    $('mcount').textContent = `${fmt(list.length)} of ${fmt(all.length)} missions`;
    const shown = list.slice(0, state.count);
    render($('mrows'), shown.length ? shown.map(missionRow) : html`<div class="empty"><h2>No missions match</h2><p>Loosen a filter or clear the search.</p></div>`);
    render($('mmore'), list.length > state.count ? html`<button class="btn" id="mmore-btn">Show ${fmt(Math.min(PAGE, list.length - state.count))} more</button>` : '');
    $('mmore-btn')?.addEventListener('click', () => { state.count += PAGE; apply(); });
    // Keep filters in the URL without re-rendering the page.
    const qs = new URLSearchParams();
    for (const k of ['q', 'cat', 'giver', 'system', 'legal', 'rank', 'combat']) if (state[k]) qs.set(k, state[k]);
    if (state.share) qs.set('share', '1');
    if (state.sort !== 'pay') qs.set('sort', state.sort);
    history.replaceState(null, '', `#/missions${qs.toString() ? '?' + qs : ''}`);
  }
  const bind = (id, key, ev = 'change', val = el => el.value) =>
    $(id).addEventListener(ev, e => { state[key] = val(e.target); state.count = PAGE; apply(); });
  bind('mq', 'q', 'input');
  bind('mgiver', 'giver'); bind('mcat', 'cat'); bind('msys', 'system'); bind('mrank', 'rank');
  bind('mlegal', 'legal'); bind('mcombat', 'combat'); bind('msort', 'sort');
  bind('mshare', 'share', 'change', el => el.checked);
  void L;
  apply();
}

async function detail(main, id) {
  let all, L;
  try { [all, L] = await Promise.all([load('missions'), lookups()]); } catch (e) { render(main, errorBox(e)); return; }
  const m = all.find(x => x.id === id);
  if (!m) { render(main, html`<div class="empty"><h2>Mission not found</h2><p>It may have been removed in a recent patch. <a href="#/missions">Back to all missions</a></p></div>`); return; }

  const faction = m.factionId ? L.factionById.get(m.factionId) : null;
  const repFactionName = m.minStanding?.faction || m.repGain?.[0]?.faction || faction?.name;
  const repFaction = (m.repGain?.[0]?.factionId && L.factionById.get(m.repGain[0].factionId)) || L.factionByName.get(repFactionName) || faction;
  const reps = myRep();
  const mine = repFaction ? reps[repFaction.id] : undefined;
  const need = m.minStanding?.rep || 0;
  const eligible = mine === undefined ? null : mine >= need && (!m.maxStanding || mine < m.maxStanding.rep || m.maxStanding.rep >= (repFaction?.ladder?.ceiling || Infinity));
  const itemLink = it => (it.id && L.itemById.has(it.id) ? html`<a href="#/items/${it.id}">${it.name}</a>` : it.name);
  const related = all.filter(x => x.id !== m.id && x.giver && x.giver === m.giver).sort((a, b) => (a.minStanding?.rep || 0) - (b.minStanding?.rep || 0)).slice(0, 8);

  render(main, html`
    <div class="crumbs"><a href="#/missions">Missions</a> / ${m.giver ? html`<a href="#/missions?giver=${encodeURIComponent(m.giver)}">${m.giver}</a>` : 'Unknown giver'}</div>
    <div class="page-head">
      <span class="eyebrow">${[m.category, m.type !== m.category ? m.type : null].filter(Boolean).join(' · ') || 'Contract'}</span>
      <h1>${tokenize(m.title)}</h1>
      <div class="chips">
        ${(m.systems || []).map(s => html`<span class="chip ${systemClass(s)}">${s}</span>`)}
        ${m.illegal ? html`<span class="chip chip-illegal">Illegal: you may gain CrimeStat</span>` : html`<span class="chip chip-legal">Legal</span>`}
        ${m.shareable ? html`<span class="chip">Shareable</span>` : html`<span class="chip">Solo only</span>`}
        ${m.combat ? html`<span class="chip chip-warn">Combat expected</span>` : html`<span class="chip">No combat listed</span>`}
        ${m.onceOnly ? html`<span class="chip chip-accent">One-time story contract</span>` : ''}
      </div>
    </div>

    <div class="stat-row" style="margin-bottom:20px">
      <div class="stat hi"><span>Pays</span><b>${payText(m)}</b></div>
      <div class="stat"><span>Reputation gained</span><b>${(m.repGain || []).length ? m.repGain.map(r => `${r.amount > 0 ? '+' : ''}${fmt(r.amount)}`).join(' / ') : '—'}</b></div>
      <div class="stat"><span>Rank needed</span><b>${m.minStanding ? m.minStanding.name : 'None'}</b></div>
      <div class="stat"><span>Rep needed</span><b>${m.minStanding ? fmt(m.minStanding.rep) : '0'}</b></div>
    </div>

    <div class="split">
      <div class="stack">
        ${m.description ? html`<div class="panel"><h2>Briefing</h2><p class="desc">${tokenize(m.description)}</p><p class="muted" style="margin-top:10px;font-size:.85rem">Words in ‹brackets› are filled in by the game when the contract is generated (target names, locations, cargo).</p></div>` : ''}

        ${repFaction?.ladder ? html`
        <div class="panel">
          <div class="panel-title"><h2>Can I take this?</h2><a href="#/factions/${repFaction.id}">${repFaction.name} ladder ${icon('arrow', 'i-sm')}</a></div>
          ${eligible === null ? html`<p class="muted">Tell us your standing with <b>${repFaction.name}</b> on its <a href="#/factions/${repFaction.id}">mission giver page</a> and we'll check this for you. You can see your standing in game under mobiGlas → Reputation.</p>`
            : eligible ? html`<p class="callout callout-tip">${icon('check')} <span>Yes. You have <b class="mono">${fmt(mine)}</b> rep with ${repFaction.name}; this needs <b class="mono">${fmt(need)}</b>.</span></p>`
            : html`<p class="callout callout-warn">${icon('info')} <span>Not yet. You have <b class="mono">${fmt(mine)}</b> rep with ${repFaction.name}; this needs <b class="mono">${fmt(need)}</b> (${m.minStanding?.name}). That's <b class="mono">${fmt(Math.max(0, need - mine))}</b> to go.</span></p>`}
          ${m.maxStanding ? html`<p class="muted" style="margin-top:8px;font-size:.9rem">Stops being offered once you reach <b>${m.maxStanding.name}</b> (${fmt(m.maxStanding.rep)} rep).</p>` : ''}
        </div>` : ''}

        ${m.locations ? html`
        <div class="panel">
          <h2>Where it happens</h2>
          <div class="stack" style="gap:14px">
            ${Object.entries(m.locations).map(([purpose, list]) => html`
              <div><h3 style="margin-bottom:6px">${purpose.replace(/([a-z])([A-Z])/g, '$1 $2')} <span class="muted mono" style="font-size:.8rem">${list.length}</span></h3>
              ${list.length > 12 ? html`<details class="more-box"><summary>Show ${list.length} possible locations</summary><ul class="loc-list">${list.map(l => html`<li>${l}</li>`)}</ul></details>` : html`<ul class="loc-list">${list.map(l => html`<li>${l}</li>`)}</ul>`}</div>`)}
          </div>
          <p class="muted" style="margin-top:12px;font-size:.88rem">The game picks one of these each time the contract spawns. Your exact marker appears in the contract once you accept it.</p>
        </div>` : ''}

        ${m.combat || m.enemyShips?.length ? html`
        <div class="panel">
          <h2>What you'll be fighting</h2>
          ${m.enemies ? html`<p style="margin-bottom:10px">Expect <b class="mono">${m.enemies[0]}–${m.enemies[1]}</b> hostiles${m.enemyNpcs?.length ? html` in groups: ${m.enemyNpcs.join(', ')}` : ''}.</p>` : ''}
          ${m.enemyShips?.length ? html`<details class="more-box" ${m.enemyShips.length <= 10 ? 'open' : ''}><summary>Possible enemy ships (${m.enemyShips.length})</summary><ul class="loc-list">${m.enemyShips.map(s => html`<li>${s}</li>`)}</ul></details>` : ''}
          <p class="callout callout-tip" style="margin-top:12px">${icon('shield')}<span>New to combat? Bring a ship with shields up, stock med pens and spare ammo, and invite a friend. Shareable contracts split the payout.</span></p>
        </div>` : ''}

        ${m.hauling?.length ? html`
        <div class="panel"><h2>Cargo to move</h2>
          <div class="table-wrap"><table><thead><tr><th>Cargo</th><th class="r">Amount</th></tr></thead><tbody>
          ${m.hauling.map(h => html`<tr><td>${h.name}</td><td class="r num">${h.minScu || h.maxScu ? `${fmt(h.minScu)}–${fmt(h.maxScu)} SCU` : h.max && h.max !== h.min ? `${h.min}–${h.max}` : h.min ?? '—'}</td></tr>`)}
          </tbody></table></div>
        </div>` : ''}

        ${m.blueprints?.length || m.rewardItems?.length ? html`
        <div class="panel"><h2>Extra rewards</h2>
          ${m.rewardItems?.length ? html`<h3 style="margin-bottom:6px">Items</h3><ul class="loc-list">${m.rewardItems.map(r => html`<li>${r.amount ? `${r.amount}× ` : ''}${itemLink(r)}</li>`)}</ul>` : ''}
          ${m.blueprints?.map(b => html`<h3 style="margin:12px 0 6px">Blueprint drop${b.chance != null ? html` <span class="chip chip-accent">${b.chance}% chance</span>` : ''}</h3><p class="muted" style="margin-bottom:6px;font-size:.88rem">You receive one blueprint from this pool, used for crafting.</p><ul class="loc-list">${b.items.map(i => html`<li>${itemLink(i)}</li>`)}</ul>`)}
        </div>` : ''}

        <div class="panel">
          <h2>How to take this contract</h2>
          <ol class="step-text" style="padding-left:1.2em">
            <li>Open your mobiGlas and go to the <b>Contracts</b> app.</li>
            <li>Look under the <b>${m.category || 'General'}</b> tab${m.giver ? html` for <b>${m.giver}</b>` : ''}. ${m.minStanding?.rep > 0 ? html`It only appears once you reach <b>${m.minStanding.name}</b>.` : ''}</li>
            <li>${m.systems?.length ? html`Be in the <b>${m.systems.join(' or ')}</b> system${m.systems.length > 1 ? 's' : ''}. ` : ''}Contracts rotate, so if it isn't listed, check back after a few minutes or try another location.</li>
            <li>Accept it, then set the marker as your route in the Starmap and quantum travel there.</li>
            ${m.shareable ? html`<li>Playing with friends? Share it from the contract screen so everyone gets credit.</li>` : ''}
          </ol>
          <p style="margin-top:10px"><a href="#/guide/first-missions-and-money">Read the contracts chapter of the guide ${icon('arrow', 'i-sm')}</a></p>
        </div>
      </div>

      <div class="stack">
        <div class="panel">
          <h2>Contract details</h2>
          <dl class="kv">
            <dt>Mission giver</dt><dd>${faction ? html`<a href="#/factions/${faction.id}">${m.giver || faction.name}</a>` : m.giver || '—'}</dd>
            ${m.faction && m.faction !== m.giver ? html`<dt>Faction</dt><dd>${m.faction}</dd>` : ''}
            <dt>Pays</dt><dd class="mono">${payText(m)}</dd>
            ${m.cost ? html`<dt>Buy-in cost</dt><dd class="mono">${auec(m.cost)}</dd>` : ''}
            ${(m.repGain || []).map(r => html`<dt>Rep gained</dt><dd><span class="mono" style="color:var(--good)">+${fmt(r.amount)}</span> ${r.faction}</dd>`)}
            ${(m.repLoss || []).map(r => html`<dt>Rep if failed</dt><dd><span class="mono" style="color:var(--bad)">${fmt(r.amount)}</span> ${r.faction}</dd>`)}
            <dt>Required rank</dt><dd>${m.minStanding ? `${m.minStanding.name} (${fmt(m.minStanding.rep)})` : 'None'}</dd>
            <dt>Systems</dt><dd>${(m.systems || []).join(', ') || 'Not listed'}</dd>
            <dt>Players</dt><dd>${m.shareable ? `Shareable${m.maxPlayers > 1 ? `, up to ${m.maxPlayers}` : ''}` : 'Solo'}</dd>
            ${m.timeLimit ? html`<dt>Time limit</dt><dd>${m.timeLimit} min</dd>` : ''}
            ${m.cooldown ? html`<dt>Cooldown</dt><dd>${m.cooldown}</dd>` : ''}
            ${m.lifetime ? html`<dt>Stays listed</dt><dd>${m.lifetime}</dd>` : ''}
            <dt>CrimeStat allowed</dt><dd>${m.crime ? `${m.crime[0]}–${m.crime[1]}` : '—'}${m.failIfCriminal ? ' (fails if you become wanted)' : ''}</dd>
            ${m.prison ? html`<dt>In prison</dt><dd>Available in Klescher</dd>` : ''}
            ${m.rentalShips?.length ? html`<dt>Ship provided</dt><dd>${m.rentalShips.join(', ')}</dd>` : ''}
            ${m.version ? html`<dt>Game version</dt><dd class="mono" style="font-size:.82rem">${m.version}</dd>` : ''}
          </dl>
          ${m.wiki ? html`<p style="margin-top:12px">${ext(m.wiki, 'View source data')}</p>` : ''}
        </div>
        ${m.requires?.length ? html`<div class="panel"><h3>Complete first</h3><div class="link-list">${m.requires.map(r => html`<a href="#/missions/${r.id}"><span>${tokenize(r.title)}</span>${icon('arrow')}</a>`)}</div></div>` : ''}
        ${m.unlocks?.length ? html`<div class="panel"><h3>Unlocks next</h3><div class="link-list">${m.unlocks.map(r => html`<a href="#/missions/${r.id}"><span>${tokenize(r.title)}</span>${icon('arrow')}</a>`)}</div></div>` : ''}
        ${related.length ? html`<div class="panel"><h3>More from ${m.giver}</h3><div class="link-list">${related.map(r => html`<a href="#/missions/${r.id}"><span>${tokenize(r.title)}<small>${r.minStanding?.name || 'No rank needed'} · ${payText(r)}</small></span>${icon('arrow')}</a>`)}</div></div>` : ''}
      </div>
    </div>
  `);
}
