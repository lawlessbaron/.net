import { html, render, icon, load, lookups, fmt, shortAuec, norm, errorBox, systemClass } from '../lib.js';

const HOME_CITIES = ['Area 18', 'Lorville', 'New Babbage', 'Orison', 'Levski'];
const SERVICES = [
  ['food', 'Food & drink'], ['armor', 'Armor & clothing'], ['weapons', 'Personal weapons & ammo'], ['medical', 'Medical'],
  ['shipyard', 'Ship dealer'], ['rental', 'Ship rental'], ['components', 'Ship parts'], ['refuel', 'Refuel'], ['repair', 'Repair'],
  ['refinery', 'Refinery'], ['trade', 'Commodity trading'], ['hab', 'Habs / respawn'],
];

// Works out what each place offers from its terminals and the items sold there.
function profile(place, itemsByTerminal) {
  const t = place.terminals;
  const sold = t.flatMap(x => itemsByTerminal.get(x.id) || []);
  const groups = new Set(sold.map(i => i.group));
  return {
    food: !!(place.food || groups.has('food')),
    armor: groups.has('armor'),
    weapons: groups.has('fps-weapons') || groups.has('attachments'),
    medical: !!(place.clinic || groups.has('gear') || t.some(x => x.medical)),
    shipyard: t.some(x => x.type === 'vehicle_buy'),
    rental: t.some(x => x.type === 'vehicle_rent'),
    components: groups.has('components') || groups.has('ship-weapons') || groups.has('missiles'),
    refuel: !!place.refuel,
    repair: !!place.repair,
    refinery: !!place.refinery,
    trade: t.some(x => /commodity/.test(x.type || '')),
    hab: !!place.hab,
  };
}

let cached;
async function prep() {
  if (cached) return cached;
  const L = await lookups();
  const itemsByTerminal = new Map();
  for (const i of L.items) for (const b of i.buy || []) {
    if (!itemsByTerminal.has(b.terminalId)) itemsByTerminal.set(b.terminalId, []);
    itemsByTerminal.get(b.terminalId).push({ ...i, price: b.price });
  }
  const profiles = new Map(L.locations.map(p => [p.id, profile(p, itemsByTerminal)]));
  cached = { L, itemsByTerminal, profiles };
  return cached;
}

const where = p => [p.moon || p.planet || p.orbit, p.system].filter(Boolean).join(' · ');

export default async function locations(main, ctx) {
  let data;
  try { data = await prep(); } catch (e) { render(main, errorBox(e)); return; }
  if (ctx.id) return detail(main, ctx.id, data);
  const { L, profiles } = data;
  const state = { q: ctx.params.q || '', system: ctx.params.system || '', svc: new Set((ctx.params.svc || '').split(',').filter(Boolean)), kind: '' };
  const systems = [...new Set(L.locations.map(l => l.system).filter(Boolean))];

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Atlas</span>
      <h1>Locations & shops</h1>
      <p class="lede">Every landing zone, station and outpost with shops. Tick what you need (food, armor, ammo, a medical bay, a refuel) and see where to get it. Click a place for its full shop list and prices.</p>
    </div>
    <div class="filters">
      <div class="field field-grow"><label for="lq">Search</label><input id="lq" type="search" placeholder="Place, planet or moon" value="${state.q}"></div>
      <div class="field"><label for="lsys">System</label><select id="lsys"><option value="">All systems</option>${systems.map(s => html`<option ${s === state.system ? 'selected' : ''}>${s}</option>`)}</select></div>
      <div class="field"><label for="lkind">Kind</label><select id="lkind"><option value="">All places</option><option>City</option><option>Station</option><option>Outpost</option></select></div>
    </div>
    <div class="field" style="margin-bottom:16px"><span class="lbl">I need</span>
      <div class="chips" id="lsvc">${SERVICES.map(([k, l]) => html`<label class="check chip" style="padding:4px 9px"><input type="checkbox" value="${k}" ${state.svc.has(k) ? 'checked' : ''}> ${l}</label>`)}</div>
    </div>
    <div class="result-count" id="lcount"></div>
    <div id="lgroups" class="stack"></div>
  `);
  const $ = id => document.getElementById(id);
  function apply() {
    const q = norm(state.q);
    const list = L.locations.filter(p => {
      if (state.system && p.system !== state.system) return false;
      if (state.kind && p.kind !== state.kind) return false;
      if (q && !norm(`${p.name} ${p.planet} ${p.moon} ${p.orbit} ${p.system}`).includes(q)) return false;
      const pr = profiles.get(p.id);
      for (const s of state.svc) if (!pr[s]) return false;
      return true;
    });
    $('lcount').textContent = `${fmt(list.length)} places`;
    const bySystem = new Map();
    for (const p of list) { if (!bySystem.has(p.system)) bySystem.set(p.system, []); bySystem.get(p.system).push(p); }
    render($('lgroups'), list.length ? [...bySystem.entries()].map(([sys, places]) => html`
      <section>
        <h2 style="margin-bottom:10px"><span class="chip ${systemClass(sys)}" style="font-size:.9rem">${sys}</span> <span class="muted mono" style="font-size:.85rem">${places.length}</span></h2>
        <div class="cards">${places.sort((a, b) => kindRank(a) - kindRank(b) || a.name.localeCompare(b.name)).map(p => placeCard(p, profiles.get(p.id)))}</div>
      </section>`) : html`<div class="empty"><h2>No place has all of that</h2><p>Untick a service or two.</p></div>`);
    const qs = new URLSearchParams();
    if (state.q) qs.set('q', state.q);
    if (state.system) qs.set('system', state.system);
    if (state.svc.size) qs.set('svc', [...state.svc].join(','));
    history.replaceState(null, '', `#/locations${qs.toString() ? '?' + qs : ''}`);
  }
  $('lq').addEventListener('input', e => { state.q = e.target.value; apply(); });
  $('lsys').addEventListener('change', e => { state.system = e.target.value; apply(); });
  $('lkind').addEventListener('change', e => { state.kind = e.target.value; apply(); });
  $('lsvc').addEventListener('change', e => { e.target.checked ? state.svc.add(e.target.value) : state.svc.delete(e.target.value); apply(); });
  apply();
}
const kindRank = p => ({ City: 0, Station: 1, Outpost: 2 }[p.kind] ?? 3);

function placeCard(p, pr) {
  const on = SERVICES.filter(([k]) => pr[k]);
  return html`
    <a class="card" href="#/locations/${p.id}">
      <div class="card-body">
        <div class="chips">
          <span class="chip">${p.kind}</span>
          ${HOME_CITIES.includes(p.name) ? html`<span class="chip chip-accent">Home city</span>` : ''}
          ${p.armistice ? html`<span class="chip chip-legal">Armistice</span>` : ''}
        </div>
        <div class="card-title">${p.name}</div>
        <div class="card-sub">${where(p)}</div>
        <div class="card-sub" style="color:var(--fg-2)">${on.length ? on.map(([, l]) => l).join(' · ') : 'Basic services'}</div>
      </div>
    </a>`;
}

async function detail(main, id, { L, itemsByTerminal, profiles }) {
  const p = L.placeById.get(id);
  if (!p) { render(main, html`<div class="empty"><h2>Place not found</h2><p><a href="#/locations">All locations</a></p></div>`); return; }
  const pr = profiles.get(p.id);
  const ids = new Set(p.terminals.map(t => t.id));
  const shipsBuy = L.ships.filter(s => s.buy?.some(b => ids.has(b.terminalId))).map(s => ({ s, price: s.buy.find(b => ids.has(b.terminalId)).price }));
  const shipsRent = L.ships.filter(s => s.rent?.some(b => ids.has(b.terminalId))).map(s => ({ s, price: s.rent.find(b => ids.has(b.terminalId)).price }));
  const missions = await load('missions').catch(() => []);
  const pn = norm(p.name);
  const contracts = missions.filter(m => m.locations && Object.values(m.locations).some(list => list.some(l => norm(l.split(' · ')[0]) === pn))).slice(0, 30);
  const shops = p.terminals
    .map(t => ({ t, items: (itemsByTerminal.get(t.id) || []).sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.items.length - a.items.length || a.t.name.localeCompare(b.t.name));

  render(main, html`
    <div class="crumbs"><a href="#/locations">Locations</a> / <a href="#/locations?system=${encodeURIComponent(p.system)}">${p.system}</a></div>
    <div class="page-head">
      <span class="eyebrow">${p.kind} · ${where(p)}</span>
      <h1>${p.name}</h1>
      <div class="chips">
        ${HOME_CITIES.includes(p.name) ? html`<span class="chip chip-accent">You can choose this as your home city</span>` : ''}
        ${p.armistice ? html`<span class="chip chip-legal">Armistice zone: no weapons fire</span>` : html`<span class="chip chip-warn">No armistice: weapons allowed</span>`}
        ${p.monitored ? html`<span class="chip">Monitored by comm array</span>` : ''}
        ${p.faction ? html`<span class="chip">${p.faction}</span>` : ''}
        ${p.pads ? html`<span class="chip">Landing pads: ${p.pads}</span>` : ''}
      </div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <h2>What's here</h2>
      <div class="services">${SERVICES.map(([k, l]) => html`<span class="svc ${pr[k] ? 'on' : ''}">${l}</span>`)}</div>
    </div>
    <div class="split">
      <div class="stack">
        ${shops.filter(x => x.items.length).map(({ t, items }) => html`
          <div class="panel">
            <div class="panel-title"><h2>${t.name}</h2><span class="muted mono" style="font-size:.85rem">${items.length} item${items.length > 1 ? 's' : ''}</span></div>
            ${groupItems(items)}
          </div>`)}
        ${shipsBuy.length ? html`<div class="panel"><h2>Ships for sale</h2><div class="table-wrap"><table><tbody>${shipsBuy.sort((a, b) => a.price - b.price).map(({ s, price }) => html`<tr><td><a href="#/ships/${s.id}">${s.name}</a><span class="sub">${s.maker || ''}</span></td><td class="r num">${fmt(price)} aUEC</td></tr>`)}</tbody></table></div></div>` : ''}
        ${shipsRent.length ? html`<div class="panel"><h2>Ships for rent</h2><div class="table-wrap"><table><tbody>${shipsRent.sort((a, b) => a.price - b.price).map(({ s, price }) => html`<tr><td><a href="#/ships/${s.id}">${s.name}</a><span class="sub">${s.maker || ''}</span></td><td class="r num">${fmt(price)} aUEC</td></tr>`)}</tbody></table></div></div>` : ''}
        ${!shops.some(x => x.items.length) && !shipsBuy.length && !shipsRent.length ? html`<div class="empty"><h2>No shop inventory on record</h2><p>This place has terminals (listed on the right) but no item prices have been reported yet.</p></div>` : ''}
      </div>
      <div class="stack">
        <div class="panel">
          <h2>Terminals & counters</h2>
          <div class="link-list">${p.terminals.map(t => html`<div style="padding:7px 10px;display:grid;gap:2px"><span>${t.name}</span><small class="muted">${termLabel(t)}</small></div>`)}</div>
        </div>
        ${contracts.length ? html`<div class="panel"><h3 style="margin-bottom:8px">Contracts that can send you here</h3><div class="link-list">${contracts.map(m => html`<a href="#/missions/${m.id}"><span>${m.title}<small>${m.giver || ''}</small></span>${icon('arrow')}</a>`)}</div></div>` : ''}
        <div class="panel">
          <h3 style="margin-bottom:8px">Getting here</h3>
          <p class="muted" style="font-size:.92rem">Open the Starmap, search for <b>${p.name}</b>, set it as your route and quantum travel. ${p.kind === 'Outpost' ? 'Outposts are on the surface: quantum to the planet or moon first, then to the outpost marker.' : p.kind === 'City' ? 'Request landing from ATC when you arrive and follow the hangar markers.' : 'Request docking or landing from ATC as you approach.'}</p>
        </div>
      </div>
    </div>
  `);
}

function termLabel(t) {
  const map = { item: 'Shop', commodity: 'Commodity trading', commodity_raw: 'Raw commodities', fuel: 'Refuel / landing services', vehicle_rent: 'Ship rental', vehicle_buy: 'Ship dealer', refinery: 'Refinery' };
  const extras = [t.medical && 'medical', t.food && 'food', t.repair && 'repair'].filter(Boolean);
  return [map[t.type] || t.type, t.company, ...extras].filter(Boolean).join(' · ');
}

function groupItems(items) {
  const byCat = new Map();
  for (const i of items) { if (!byCat.has(i.cat)) byCat.set(i.cat, []); byCat.get(i.cat).push(i); }
  return [...byCat.entries()].map(([cat, list]) => html`
    <details class="more-box" ${byCat.size <= 2 || list.length <= 6 ? 'open' : ''} style="margin-bottom:8px">
      <summary>${cat} <span class="muted mono" style="font-size:.8rem">${list.length}</span></summary>
      <div class="table-wrap"><table><tbody>${list.map(i => html`<tr><td><a href="#/items/${i.id}">${i.name}</a>${i.maker ? html`<span class="sub">${i.maker}</span>` : ''}</td><td class="r num">${shortAuec(i.price)}</td></tr>`)}</tbody></table></div>
    </details>`);
}
