import { html, render, icon, load, lookups, fmt, auec, shortAuec, norm, errorBox, img } from '../lib.js';

const PAGE = 100;
const price = i => i.buy?.[0]?.price || null;
const temp = s => (s.tempMin != null ? `${fmt(s.tempMin)}° to ${fmt(s.tempMax)}°` : '—');

// Column sets per group: [label, value getter, display, numeric?]
const COLS = {
  'fps-weapons': [['Type', i => i.stats.kind || i.sub], ['DPS', i => i.stats.dps, null, 1], ['Damage/shot', i => i.stats.alpha, null, 1], ['RPM', i => i.stats.rpm, null, 1], ['Range (m)', i => i.stats.range, null, 1], ['Mag', i => i.stats.mag, null, 1]],
  'ship-weapons': [['Size', i => i.size, v => `S${v}`, 1], ['Type', i => i.stats.kind], ['DPS', i => i.stats.dps, null, 1], ['Damage/shot', i => i.stats.alpha, null, 1], ['RPM', i => i.stats.rpm, null, 1], ['Range (m)', i => i.stats.range, null, 1]],
  missiles: [['Size', i => i.size, v => `S${v}`, 1], ['Tracking', i => i.stats.kind], ['Damage', i => i.stats.damage, null, 1], ['Speed', i => i.stats.speed, null, 1], ['Lock range (m)', i => i.stats.range, null, 1]],
  armor: [['Piece', i => i.cat.replace('Armor — ', '')], ['Weight', i => i.sub], ['Damage reduction', i => i.stats.physical, v => `${v}%`, 1], ['Temperature', i => i.stats.tempMin, (v, i) => temp(i.stats), 1], ['Storage (SCU)', i => i.stats.storage, v => fmt(v, 3), 1]],
  components: [['Type', i => i.cat], ['Size', i => i.size, v => `S${v}`, 1], ['Grade', i => i.grade], ['Class', i => i.cls], ['Key stat', i => i.stats.hp || i.stats.output || i.stats.cooling || i.stats.qtSpeed, (v, i) => keyStat(i), 1]],
  mining: [['Type', i => i.cat], ['Size', i => i.size, v => `S${v}`, 1], ['Max power', i => i.stats.power, null, 1], ['Optimal range', i => i.stats.optimal, v => `${fmt(v)} m`, 1], ['Module slots', i => i.stats.modules, null, 1]],
  salvage: [['Size', i => i.size, v => `S${v}`, 1], ['Maker', i => i.maker]],
  food: [['Type', i => i.cat], ['Hunger', i => i.stats.hunger, null, 1], ['Thirst', i => i.stats.thirst, null, 1], ['Effects', i => i.stats.effects]],
  gear: [['Type', i => i.cat], ['Effects', i => i.stats.effects], ['Maker', i => i.maker]],
  attachments: [['Type', i => i.sub], ['Size', i => i.size, null, 1], ['Maker', i => i.maker]],
};
const GROUPS = [
  ['fps-weapons', 'Personal weapons'], ['armor', 'Armor & clothing'], ['gear', 'Medical & gadgets'], ['food', 'Food & drink'],
  ['attachments', 'Attachments & ammo'], ['ship-weapons', 'Ship weapons'], ['missiles', 'Missiles'], ['components', 'Ship components'],
  ['mining', 'Mining'], ['salvage', 'Salvage'],
];
function keyStat(i) {
  const s = i.stats;
  if (s.hp) return `${fmt(s.hp)} HP shield`;
  if (s.output) return `${fmt(s.output)} power`;
  if (s.cooling) return `${fmt(s.cooling)} cooling`;
  if (s.qtSpeed) return `${fmt(s.qtSpeed)} km/s`;
  return '—';
}

export default async function items(main, ctx) {
  let all;
  try { all = await load('items'); } catch (e) { render(main, errorBox(e)); return; }
  if (ctx.id) return detail(main, ctx.id, all);

  const p = ctx.params;
  const state = { group: p.group || 'fps-weapons', q: p.q || '', buyable: p.buyable !== '0', sub: '', sort: p.sort || 'name', dir: 1, count: PAGE };

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Armory & outfitter</span>
      <h1>Weapons, armor & items</h1>
      <p class="lede">Stats for every gun, armor piece, ship component, missile, med pen and snack, plus every shop that sells it and the price. Pick a category, then click any item for where to buy it.</p>
    </div>
    <div class="seg" id="igroups" style="margin-bottom:14px">${GROUPS.map(([g, l]) => html`<button type="button" data-g="${g}" class="${g === state.group ? 'on' : ''}">${l}</button>`)}</div>
    <div class="filters">
      <div class="field field-grow"><label for="iq">Search</label><input id="iq" type="search" placeholder="Name, maker or type" value="${state.q}"></div>
      <div class="field"><label for="isub">Filter</label><select id="isub"></select></div>
      <label class="check"><input type="checkbox" id="ibuy" ${state.buyable ? 'checked' : ''}> Only items sold in shops</label>
    </div>
    <div class="result-count" id="icount"></div>
    <div class="table-wrap"><table><thead id="ihead"></thead><tbody id="ibody"></tbody></table></div>
    <div class="more" id="imore"></div>
  `);
  const $ = id => document.getElementById(id);

  function subOptions() {
    const inGroup = all.filter(i => i.group === state.group);
    const key = state.group === 'armor' || state.group === 'components' || state.group === 'food' || state.group === 'gear' || state.group === 'mining' ? 'cat' : state.group === 'fps-weapons' || state.group === 'ship-weapons' ? 'kind' : 'size';
    const vals = [...new Set(inGroup.map(i => (key === 'kind' ? i.stats.kind : i[key])).filter(v => v != null && v !== ''))].sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))));
    render($('isub'), html`<option value="">All</option>${vals.map(v => html`<option value="${key}:${v}" ${state.sub === `${key}:${v}` ? 'selected' : ''}>${key === 'size' ? `Size ${v}` : v}</option>`)}`);
  }

  function apply() {
    const cols = COLS[state.group] || [];
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    const [sk, sv] = state.sub ? [state.sub.slice(0, state.sub.indexOf(':')), state.sub.slice(state.sub.indexOf(':') + 1)] : [];
    let list = all.filter(i => {
      if (i.group !== state.group) return false;
      if (state.buyable && !i.buy?.length) return false;
      if (sk) {
        const v = sk === 'kind' ? i.stats.kind : i[sk];
        if (String(v) !== sv) return false;
      }
      if (q.length) {
        const hay = norm(`${i.name} ${i.maker} ${i.cat} ${i.sub} ${i.stats.kind || ''}`);
        if (!q.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const getters = { name: i => i.name, price: i => price(i), maker: i => i.maker };
    cols.forEach(([l, g], ix) => { getters[`c${ix}`] = g; });
    const g = getters[state.sort] || getters.name;
    list.sort((a, b) => {
      const va = g(a), vb = g(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * state.dir;
    });
    const th = (key, label, r) => html`<th data-sort="${key}" class="${r ? 'r' : ''} ${state.sort === key ? 'sorted' : ''}">${label}${state.sort === key ? (state.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
    render($('ihead'), html`<tr>${th('name', 'Name')}${cols.map(([l, , , n], ix) => th(`c${ix}`, l, n))}${th('price', 'Cheapest', 1)}<th>Where</th></tr>`);
    $('icount').textContent = `${fmt(list.length)} items`;
    render($('ibody'), list.length ? list.slice(0, state.count).map(i => html`
      <tr class="rowlink" data-href="#/items/${i.id}">
        <td><a href="#/items/${i.id}"><b>${i.name}</b></a><span class="sub">${i.maker || ''}</span></td>
        ${cols.map(([, get, show, n]) => { const v = get(i); return html`<td class="${n ? 'r num' : ''}">${v == null || v === '' ? '—' : show ? show(v, i) : n ? fmt(v, 1) : v}</td>`; })}
        <td class="r num">${price(i) ? shortAuec(price(i)) : html`<span class="muted">${i.loot ? 'Loot' : '—'}</span>`}</td>
        <td style="font-size:.84rem">${i.buy?.length ? `${i.buy.length} shop${i.buy.length > 1 ? 's' : ''}` : html`<span class="muted">${i.craft ? 'Crafted / reward' : 'Not sold'}</span>`}</td>
      </tr>`) : html`<tr><td colspan="${cols.length + 3}"><div class="empty" style="border:0">Nothing matches. Untick "Only items sold in shops" to include loot-only items.</div></td></tr>`);
    render($('imore'), list.length > state.count ? html`<button class="btn" id="imore-btn">Show more</button>` : '');
    $('imore-btn')?.addEventListener('click', () => { state.count += PAGE; apply(); });
    const qs = new URLSearchParams({ group: state.group });
    if (state.q) qs.set('q', state.q);
    if (!state.buyable) qs.set('buyable', '0');
    history.replaceState(null, '', `#/items?${qs}`);
  }
  $('igroups').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.group = b.dataset.g; state.sub = ''; state.sort = 'name'; state.dir = 1; state.count = PAGE;
    document.querySelectorAll('#igroups button').forEach(x => x.classList.toggle('on', x === b));
    subOptions(); apply();
  });
  $('ihead').addEventListener('click', e => {
    const t = e.target.closest('th[data-sort]'); if (!t) return;
    if (state.sort === t.dataset.sort) state.dir *= -1; else { state.sort = t.dataset.sort; state.dir = t.dataset.sort === 'name' ? 1 : -1; }
    if (state.sort === 'price' && state.dir === -1 && t.dataset.sort === 'price' && !e.detail) state.dir = 1;
    apply();
  });
  $('ibody').addEventListener('click', e => {
    if (e.target.closest('a')) return;
    const tr = e.target.closest('tr[data-href]'); if (tr) location.hash = tr.dataset.href;
  });
  $('iq').addEventListener('input', e => { state.q = e.target.value; state.count = PAGE; apply(); });
  $('isub').addEventListener('change', e => { state.sub = e.target.value; state.count = PAGE; apply(); });
  $('ibuy').addEventListener('change', e => { state.buyable = e.target.checked; state.count = PAGE; apply(); });
  subOptions();
  apply();
}

const STAT_LABELS = {
  kind: 'Type', class: 'Class', dps: 'Damage per second', alpha: 'Damage per shot', rpm: 'Rounds per minute', range: 'Range (m)', mag: 'Magazine', modes: 'Fire modes',
  damage: 'Damage', ammo: 'Ammo capacity', speed: 'Speed (m/s)', lock: 'Lock time (s)', cluster: 'Cluster size', slot: 'Slot',
  physical: 'Physical damage reduction (%)', energy: 'Energy damage reduction (%)', impact: 'Impact reduction (%)', tempMin: 'Min temperature (°C)', tempMax: 'Max temperature (°C)', storage: 'Storage (SCU)',
  hp: 'Shield HP', regen: 'Regen per second', downedDelay: 'Regen delay when downed (s)', output: 'Power output', cooling: 'Cooling', qtSpeed: 'Quantum speed (km/s)', cooldown: 'Cooldown (s)', fuelReq: 'Fuel use',
  power: 'Max laser power', optimal: 'Optimal range (m)', maxRange: 'Max range (m)', modules: 'Module slots', hunger: 'Hunger restored', thirst: 'Thirst restored', effects: 'Effects', bdl: 'Blood drug level',
};

async function detail(main, id, all) {
  const i = all.find(x => x.id === id);
  if (!i) { render(main, html`<div class="empty"><h2>Item not found</h2><p><a href="#/items">All items</a></p></div>`); return; }
  const [L, missions] = await Promise.all([lookups().catch(() => null), load('missions').catch(() => [])]);
  const rewardFrom = missions.filter(m => (m.blueprints || []).some(b => b.items.some(x => x.id === i.id)) || (m.rewardItems || []).some(r => r.id === i.id)).slice(0, 12);
  const similar = all.filter(x => x.id !== i.id && x.cat === i.cat && (i.size == null || x.size === i.size) && x.buy?.length).slice(0, 8);
  const shops = (i.buy || []).map(b => ({ ...b, t: L?.terminalById.get(b.terminalId) })).filter(b => b.t);

  render(main, html`
    <div class="crumbs"><a href="#/items?group=${i.group}">${GROUPS.find(g => g[0] === i.group)?.[1] || 'Items'}</a> / ${i.cat}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1fr) 220px;gap:20px;margin-bottom:20px;align-items:start" id="item-top">
      <div class="page-head" style="margin:0">
        <span class="eyebrow">${[i.cat, i.sub].filter(Boolean).join(' · ')}</span>
        <h1>${i.name}</h1>
        <div class="chips">
          ${i.maker ? html`<span class="chip">${i.maker}</span>` : ''}
          ${i.size != null ? html`<span class="chip">Size ${i.size}</span>` : ''}
          ${i.grade ? html`<span class="chip">Grade ${i.grade}</span>` : ''}
          ${i.cls ? html`<span class="chip">${i.cls}</span>` : ''}
          ${i.loot ? html`<span class="chip">Lootable</span>` : ''}
          ${i.craft ? html`<span class="chip chip-accent">Craftable</span>` : ''}
        </div>
        ${i.desc ? html`<p class="lede">${i.desc}</p>` : ''}
      </div>
      <div class="card-media" style="aspect-ratio:1;border-radius:8px;border:1px solid var(--line)">${img(i.img, i.name, 'item')}</div>
    </div>
    <div class="split">
      <div class="stack">
        <div class="panel">
          <div class="panel-title"><h2>Where to buy</h2>${shops.length ? html`<span class="muted mono" style="font-size:.85rem">${shops.length} shop${shops.length > 1 ? 's' : ''}</span>` : ''}</div>
          ${shops.length ? html`<div class="table-wrap"><table><thead><tr><th>Shop</th><th>Location</th><th class="r">Price</th></tr></thead><tbody>
            ${shops.map(b => html`<tr><td>${b.t.name}</td><td><a href="#/locations/${b.t.placeId}">${b.t.place}</a><span class="sub">${[b.t.moon || b.t.planet, b.t.system].filter(Boolean).join(' · ')}</span></td><td class="r num">${auec(b.price)}</td></tr>`)}
          </tbody></table></div>`
          : html`<p class="muted">No shop sells this right now. ${i.loot ? 'It can be found as loot (crates, enemies, derelicts). ' : ''}${i.craft ? 'It can also be crafted from a blueprint. ' : ''}${rewardFrom.length ? 'Some missions give it as a reward, listed below.' : ''}</p>`}
        </div>
        ${rewardFrom.length ? html`<div class="panel"><h2>Earned from missions</h2><div class="link-list">${rewardFrom.map(m => html`<a href="#/missions/${m.id}"><span>${m.title}<small>${m.giver || ''}</small></span>${icon('arrow')}</a>`)}</div></div>` : ''}
        ${similar.length ? html`<div class="panel"><h2>Similar items you can buy</h2><div class="table-wrap"><table><tbody>${similar.map(x => html`<tr class="rowlink"><td><a href="#/items/${x.id}">${x.name}</a><span class="sub">${x.maker || ''}</span></td><td class="r num">${shortAuec(price(x))}</td></tr>`)}</tbody></table></div></div>` : ''}
      </div>
      <div class="stack">
        <div class="panel">
          <h2>Stats</h2>
          <dl class="kv">
            ${Object.entries(i.stats || {}).map(([k, v]) => html`<dt>${STAT_LABELS[k] || k}</dt><dd class="${typeof v === 'number' ? 'mono' : ''}">${typeof v === 'number' ? fmt(v, 2) : v}</dd>`)}
            ${i.size != null ? html`<dt>Size</dt><dd class="mono">${i.size}</dd>` : ''}
            <dt>Cheapest price</dt><dd class="mono">${price(i) ? auec(price(i)) : '—'}</dd>
          </dl>
          ${i.group === 'armor' ? html`<p class="muted" style="margin-top:10px;font-size:.88rem">Temperature range is the environment you can survive in with this piece. Pair with an undersuit and helmet before leaving a station.</p>` : ''}
        </div>
      </div>
    </div>
  `);
  if (matchMedia('(max-width: 640px)').matches) document.getElementById('item-top').style.gridTemplateColumns = 'minmax(0,1fr)';
}
