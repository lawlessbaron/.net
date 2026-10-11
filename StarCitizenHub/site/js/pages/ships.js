import { html, render, icon, load, lookups, fmt, auec, shortAuec, usd, norm, img, errorBox, ext, toast, systemClass, openZoom } from '../lib.js';
import { skuTable } from './pledge.js';
import { paintFor } from '../shipart.js';
import { addShip, fleetCount, getCompare, toggleCompare, clearCompare } from '../fleetstore.js';

const PAGE = 48;
const SORTS = [
  ['name', 'Name'], ['price', 'Cheapest in game'], ['price-desc', 'Most expensive'], ['cargo', 'Most cargo'],
  ['speed', 'Fastest (SCM)'], ['dps', 'Most firepower'], ['shield', 'Strongest shields'], ['size', 'Biggest'], ['msrp', 'Pledge price'],
];
const minPrice = s => s.buy?.[0]?.price || 0;

export default async function ships(main, ctx) {
  let all;
  try { all = await load('ships'); } catch (e) { render(main, errorBox(e)); return; }
  if (ctx.variant === 'compare') return compare(main, all);
  if (ctx.id) return detail(main, ctx.id, all);

  const p = ctx.params;
  const state = {
    q: p.q || '', maker: p.maker || '', career: p.career || '', size: p.size || '', kind: p.kind || '',
    buyable: p.buyable === '1', rentable: p.rentable === '1', pledge: p.pledge === '1', sort: p.sort || 'name', count: PAGE,
  };
  const makers = [...new Set(all.map(s => s.maker).filter(Boolean))].sort();
  const careers = [...new Set(all.map(s => s.career).filter(Boolean))].sort();
  const sizes = [...new Set(all.map(s => s.size).filter(Boolean))];
  const sizeOrder = ['Vehicle', 'Snub', 'Small', 'Medium', 'Large', 'Capital'];
  sizes.sort((a, b) => (sizeOrder.indexOf(a) + 99) % 99 - (sizeOrder.indexOf(b) + 99) % 99);

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Shipyard</span>
      <h1>Ships & vehicles</h1>
      <p class="lede">Every ship and variant with real game stats. See what each costs in aUEC, which dealers sell or rent it, and what it costs to pledge. Tick ships to compare them side by side.</p>
    </div>
    <div class="filters">
      <div class="field field-grow"><label for="sq">Search</label><input id="sq" type="search" placeholder="Name, maker or role (e.g. cargo, mining)" value="${state.q}"></div>
      <div class="field"><label for="smaker">Manufacturer</label><select id="smaker"><option value="">All makers</option>${makers.map(m => html`<option ${m === state.maker ? 'selected' : ''}>${m}</option>`)}</select></div>
      <div class="field"><label for="scareer">Career</label><select id="scareer"><option value="">All careers</option>${careers.map(m => html`<option ${m === state.career ? 'selected' : ''}>${m}</option>`)}</select></div>
      <div class="field"><label for="ssize">Size</label><select id="ssize"><option value="">All sizes</option>${sizes.map(m => html`<option ${m === state.size ? 'selected' : ''}>${m}</option>`)}</select></div>
      <div class="field"><label for="skind">Type</label><select id="skind"><option value="">Ships & vehicles</option><option value="ship" ${state.kind === 'ship' ? 'selected' : ''}>Spaceships</option><option value="ground" ${state.kind === 'ground' ? 'selected' : ''}>Ground vehicles</option><option value="concept" ${state.kind === 'concept' ? 'selected' : ''}>In concept (not flyable yet)</option><option value="flyable" ${state.kind === 'flyable' ? 'selected' : ''}>Flyable now</option></select></div>
      <div class="field"><label for="ssort">Sort</label><select id="ssort">${SORTS.map(([v, l]) => html`<option value="${v}" ${v === state.sort ? 'selected' : ''}>${l}</option>`)}</select></div>
      <label class="check"><input type="checkbox" id="sbuy" ${state.buyable ? 'checked' : ''}> Buyable in game</label>
      <label class="check"><input type="checkbox" id="srent" ${state.rentable ? 'checked' : ''}> Rentable</label>
      <label class="check"><input type="checkbox" id="spledge" ${state.pledge ? 'checked' : ''}> On the pledge store</label>
    </div>
    <div class="result-count" id="scount"></div>
    <div class="cards" id="scards"></div>
    <div class="more" id="smore"></div>
    <div id="tray-host"></div>
  `);
  const $ = id => document.getElementById(id);

  function apply() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    let list = all.filter(s => {
      if (state.maker && s.maker !== state.maker) return false;
      if (state.career && s.career !== state.career) return false;
      if (state.size && s.size !== state.size) return false;
      if (state.kind === 'ship' && s.ground) return false;
      if (state.kind === 'ground' && !s.ground) return false;
      if (state.kind === 'concept' && !s.isConcept) return false;
      if (state.kind === 'flyable' && s.isConcept) return false;
      if (state.buyable && !s.buy?.length) return false;
      if (state.rentable && !s.rent?.length) return false;
      if (state.pledge && !s.pledgeAvailable) return false;
      if (q.length) {
        const hay = norm(`${s.name} ${s.fullName} ${s.maker} ${s.career} ${s.role} ${(s.foci || []).join(' ')} ${(s.roles || []).join(' ')}`);
        if (!q.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const by = {
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => (minPrice(a) || 9e15) - (minPrice(b) || 9e15),
      'price-desc': (a, b) => minPrice(b) - minPrice(a),
      cargo: (a, b) => (b.cargo || 0) - (a.cargo || 0),
      speed: (a, b) => (b.scm || 0) - (a.scm || 0),
      dps: (a, b) => (b.dps || 0) - (a.dps || 0),
      shield: (a, b) => (b.shield || 0) - (a.shield || 0),
      size: (a, b) => (b.length || 0) - (a.length || 0),
      msrp: (a, b) => (b.msrp || 0) - (a.msrp || 0),
    };
    list.sort(by[state.sort] || by.name);
    $('scount').textContent = `${fmt(list.length)} of ${fmt(all.length)} ships & vehicles`;
    const cmp = getCompare();
    render($('scards'), list.length ? list.slice(0, state.count).map(s => shipCard(s, cmp.includes(s.id))) : html`<div class="empty"><h2>No ships match</h2><p>Try removing a filter.</p></div>`);
    render($('smore'), list.length > state.count ? html`<button class="btn" id="smore-btn">Show more</button>` : '');
    $('smore-btn')?.addEventListener('click', () => { state.count += PAGE; apply(); });
    drawTray(all);
    const qs = new URLSearchParams();
    for (const k of ['q', 'maker', 'career', 'size', 'kind']) if (state[k]) qs.set(k, state[k]);
    for (const k of ['buyable', 'rentable', 'pledge']) if (state[k]) qs.set(k, '1');
    if (state.sort !== 'name') qs.set('sort', state.sort);
    history.replaceState(null, '', `#/ships${qs.toString() ? '?' + qs : ''}`);
  }
  const bind = (id, key, ev = 'change', val = el => el.value) => $(id).addEventListener(ev, e => { state[key] = val(e.target); state.count = PAGE; apply(); });
  bind('sq', 'q', 'input'); bind('smaker', 'maker'); bind('scareer', 'career'); bind('ssize', 'size'); bind('skind', 'kind'); bind('ssort', 'sort');
  bind('sbuy', 'buyable', 'change', el => el.checked); bind('srent', 'rentable', 'change', el => el.checked); bind('spledge', 'pledge', 'change', el => el.checked);
  $('scards').addEventListener('click', e => {
    const b = e.target.closest('[data-compare]');
    if (!b) return;
    e.preventDefault();
    toggleCompare(b.dataset.compare);
    apply();
  });
  apply();
}

export function shipCard(s, comparing = false) {
  return html`
    <a class="card" href="#/ships/${s.id}">
      <div class="card-media">${img(s.img, s.name)}
        <div class="card-flag">
          ${s.buy?.length ? html`<span class="chip chip-accent">Buy in game</span>` : ''}
          ${s.rent?.length ? html`<span class="chip">Rent</span>` : ''}
          ${s.isConcept ? html`<span class="chip chip-warn">In concept</span>` : ''}
        </div>
        <button type="button" class="icon-btn card-add btn-sm" data-compare="${s.id}" aria-pressed="${comparing}" title="${comparing ? 'Remove from compare' : 'Add to compare'}" style="${comparing ? 'background:var(--accent);color:var(--accent-ink)' : ''}">${icon(comparing ? 'check' : 'scale')}</button>
      </div>
      <div class="card-body">
        <div class="card-title">${s.name}</div>
        <div class="card-sub">${s.maker || ''}${s.role ? ` · ${s.role}` : ''}</div>
        <div class="card-stats">
          <span><b>${s.buy?.length ? shortAuec(s.buy[0].price) : s.msrp ? usd(s.msrp) : '—'}</b>${s.buy?.length ? 'aUEC' : s.msrp ? 'pledge' : 'price'}</span>
          <span><b>${s.cargo != null ? fmt(s.cargo) : '—'}</b>SCU</span>
          <span><b>${s.crewMax ? (s.crewMin && s.crewMin !== s.crewMax ? `${s.crewMin}–${s.crewMax}` : s.crewMax) : '—'}</b>crew</span>
        </div>
      </div>
    </a>`;
}

function drawTray(all) {
  const host = document.getElementById('tray-host');
  if (!host) return;
  const ids = getCompare();
  if (!ids.length) { render(host, ''); return; }
  const names = ids.map(id => all.find(s => s.id === id)?.name || id);
  render(host, html`<div class="tray">${icon('scale')}<span><b>${ids.length}</b> to compare: ${names.join(', ')}</span>
    <a class="btn btn-primary btn-sm" href="#/compare">Compare</a><button type="button" class="btn btn-sm btn-ghost" id="tray-clear">Clear</button></div>`);
  document.getElementById('tray-clear').addEventListener('click', () => { clearCompare(); document.querySelectorAll('[data-compare]').forEach(b => { b.style.cssText = ''; }); drawTray(all); location.hash.startsWith('#/ships') && window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

// Relative bar against the biggest value across all ships.
function maxes(all) {
  const keys = ['scm', 'maxSpeed', 'cargo', 'hp', 'shield', 'dps', 'qtRange', 'length', 'pitch', 'roll', 'hydrogen', 'qtFuel', 'missileDmg'];
  const m = {};
  for (const k of keys) m[k] = Math.max(...all.filter(s => !s.ground || k === 'scm').map(s => s[k] || 0));
  return m;
}
const bar = (label, v, max, unit = '', d = 0) => html`
  <div class="bar"><span class="k">${label}</span><span class="track"><span class="fill" style="display:block;width:${v ? Math.max(2, Math.min(100, (v / (max || 1)) * 100)) : 0}%"></span></span><span class="v">${v != null ? fmt(v, d) + unit : '—'}</span></div>`;

async function detail(main, id, all) {
  const s = all.find(x => x.id === id);
  if (!s) { render(main, html`<div class="empty"><h2>Ship not found</h2><p><a href="#/ships">All ships</a></p></div>`); return; }
  const L = await lookups().catch(() => null);
  const M = maxes(all);
  const variants = (s.variants || []).map(v => all.find(x => x.id === v)).filter(Boolean);
  const sameRole = all.filter(x => x.id !== s.id && x.career === s.career && !variants.includes(x) && x.ground === s.ground && Math.abs((x.length || 0) - (s.length || 0)) < (s.length || 20) * 0.35).slice(0, 6);
  const owned = fleetCount(s.id);
  const placeLink = r => (r.placeId && L?.placeById.has(r.placeId) ? html`<a href="#/locations/${r.placeId}">${r.place}</a>` : r.place || '—');

  render(main, html`
    <div class="crumbs"><a href="#/ships">Ships</a> / ${s.maker ? html`<a href="#/ships?maker=${encodeURIComponent(s.maker)}">${s.maker}</a>` : ''}</div>
    <div class="grid" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:24px;margin-bottom:22px" id="ship-top">
      <div class="card-media" style="border-radius:10px;border:1px solid var(--line);aspect-ratio:16/9">${img(s.imgFull || s.img, s.name)}</div>
      <div class="stack" style="align-content:start">
        <span class="eyebrow">${[s.maker, s.career].filter(Boolean).join(' · ')}</span>
        <h1>${s.name}</h1>
        <p class="lede" style="font-size:1rem">${s.role || ''}</p>
        <div class="chips">
          ${s.size ? html`<span class="chip">${s.size}</span>` : ''}
          ${s.status ? html`<span class="chip ${s.status === 'flight-ready' ? 'chip-live' : 'chip-warn'}">${s.status}</span>` : ''}
          ${(s.roles || []).slice(0, 6).map(r => html`<span class="chip">${r}</span>`)}
        </div>
        <div class="stat-row">
          <div class="stat hi"><span>In-game price</span><b>${s.buy?.length ? shortAuec(s.buy[0].price) : 'Not sold'}</b></div>
          <div class="stat"><span>Rent from</span><b>${s.rent?.length ? shortAuec(s.rent[0].price) : '—'}</b></div>
          <div class="stat"><span>Pledge</span><b>${s.msrp ? usd(s.msrp) : '—'}</b></div>
        </div>
        <div class="hero-actions">
          <button class="btn btn-primary" id="add-fleet" type="button">${icon('plus')} Add to my fleet${owned ? ` (${owned} owned)` : ''}</button>
          <button class="btn" id="cmp" type="button">${icon('scale')} ${getCompare().includes(s.id) ? 'Remove from compare' : 'Compare'}</button>
          ${s.side || s.top ? html`<a class="btn btn-ghost" href="#/studio?t=ship&id=${s.id}">${icon('play')} Share</a>` : ''}
        </div>
      </div>
    </div>

    ${s.views || s.top || s.side || s.holo || s.paints ? html`
    <section class="panel viewer-panel" style="margin-bottom:20px">
      <div class="panel-title">
        <h2>Look around</h2>
        <div class="seg" id="vtabs">
          ${s.views ? html`<button type="button" data-v="ingame" class="on">In-game views</button>` : ''}
          ${s.top || s.side ? html`<button type="button" data-v="blueprint" class="${s.views ? '' : 'on'}">Blueprint</button>` : ''}
          ${s.holo ? html`<button type="button" data-v="3d" class="${s.views || s.top || s.side ? '' : 'on'}">3D model</button>` : ''}
          ${s.paints ? html`<button type="button" data-v="paints" class="${s.views || s.top || s.side || s.holo ? '' : 'on'}">Paints (${s.paints})</button>` : ''}
        </div>
      </div>
      <div id="vbody"></div>
      ${s.outlineFrom ? html`<p class="muted" style="font-size:.85rem;margin-top:8px">Shares its hull with the ${s.outlineFrom}; views show that model.</p>` : ''}
    </section>` : ''}

    <div class="split">
      <div class="stack">
        ${s.description ? html`<div class="panel"><h2>Overview</h2><p class="desc">${s.description}</p></div>` : ''}

        <div class="panel">
          <div class="panel-title"><h2>Where to buy in game</h2><span class="muted" style="font-size:.85rem">Prices in aUEC</span></div>
          ${s.buy?.length ? html`<div class="table-wrap"><table><thead><tr><th>Dealer</th><th>Location</th><th class="r">Price</th></tr></thead><tbody>
            ${s.buy.map(r => html`<tr><td>${r.terminal}</td><td>${placeLink(r)}<span class="sub">${r.system || ''}</span></td><td class="r num">${fmt(r.price)}</td></tr>`)}
          </tbody></table></div>
          <p class="muted" style="margin-top:10px;font-size:.88rem">Walk up to the dealer's kiosk, pick the ship and pay with aUEC. It's added to your fleet; call it from any fleet manager (ASOP) terminal at a spaceport or station with a pad big enough for it.</p>`
          : html`<p class="muted">Not sold for aUEC right now. ${s.pledgeUrl ? html`You can get it on the ${ext(s.pledgeUrl, 'RSI pledge store')}${s.rent?.length ? ', or rent it below' : ''}.` : ''} Ships rotate in and out of in-game shops between patches.</p>`}
        </div>

        ${s.rent?.length ? html`
        <div class="panel">
          <div class="panel-title"><h2>Where to rent</h2><span class="muted" style="font-size:.85rem">aUEC, shortest rental period</span></div>
          <div class="table-wrap"><table><thead><tr><th>Rental counter</th><th>Location</th><th class="r">Price</th></tr></thead><tbody>
            ${s.rent.map(r => html`<tr><td>${r.terminal}</td><td>${placeLink(r)}<span class="sub">${r.system || ''}</span></td><td class="r num">${fmt(r.price)}</td></tr>`)}
          </tbody></table></div>
          <p class="callout callout-tip" style="margin-top:10px">${icon('info')}<span>Renting is a cheap way to try a ship before saving up for it. Rentals expire, and you get no insurance claim if it explodes.</span></p>
        </div>` : ''}

        ${s.skus?.length ? html`<div class="panel"><div class="panel-title"><h2>Real-money prices</h2><span class="muted" style="font-size:.85rem">RSI pledge store, USD excl. tax</span></div>${skuTable(s.skus)}</div>` : ''}

        <div class="panel">
          <h2>Performance</h2>
          <p class="muted" style="margin-bottom:12px;font-size:.9rem">Bars compare against the best value of any ship in the game.</p>
          <div class="bars">
            ${bar('SCM speed', s.scm, M.scm, ' m/s')}
            ${bar('Max speed', s.maxSpeed, M.maxSpeed, ' m/s')}
            ${bar('Pitch', s.pitch, M.pitch, '°/s')}
            ${bar('Roll', s.roll, M.roll, '°/s')}
            ${bar('Hull HP', s.hp, M.hp)}
            ${bar('Shields', s.shield, M.shield)}
            ${bar('Pilot DPS', s.dps, M.dps, '', 0)}
            ${bar('Missile dmg', s.missileDmg, M.missileDmg)}
            ${bar('Cargo', s.cargo, M.cargo, ' SCU')}
            ${bar('QT range', s.qtRange, M.qtRange, ' Gm', 1)}
            ${bar('Hydrogen', s.hydrogen, M.hydrogen, '', 1)}
          </div>
        </div>

        ${s.guns?.length ? html`<div class="panel"><h2>Stock weapons</h2>
          <div class="chips">${Object.entries(s.guns.reduce((a, g) => ((a[g] = (a[g] || 0) + 1), a), {})).map(([g, n]) => html`<span class="chip">${n}× ${g}</span>`)}</div>
          ${s.missiles ? html`<p style="margin-top:10px">${s.missiles} missiles, ${fmt(s.missileDmg)} total damage.</p>` : ''}
          <p style="margin-top:10px"><a href="#/items?group=ship-weapons">Browse ship weapons to upgrade ${icon('arrow', 'i-sm')}</a></p>
        </div>` : ''}

        ${variants.length ? html`<div class="panel"><h2>Variants of this hull</h2><div class="cards">${variants.map(v => shipCard(v))}</div></div>` : ''}
        ${sameRole.length ? html`<div class="panel"><h2>Similar ships</h2><div class="cards">${sameRole.map(v => shipCard(v))}</div></div>` : ''}
      </div>

      <div class="stack">
        <div class="panel">
          <h2>Specifications</h2>
          <dl class="kv">
            <dt>Manufacturer</dt><dd>${s.maker || '—'}</dd>
            <dt>Career / role</dt><dd>${[s.career, s.role].filter(Boolean).join(' / ') || '—'}</dd>
            <dt>Size</dt><dd>${s.size || '—'}${s.sizeClass ? ` (class ${s.sizeClass})` : ''}</dd>
            <dt>Dimensions</dt><dd class="mono">${s.length ? `${fmt(s.length, 1)} × ${fmt(s.beam, 1)} × ${fmt(s.height, 1)} m` : '—'}</dd>
            <dt>Mass</dt><dd class="mono">${s.mass ? `${fmt(s.mass)} kg` : '—'}</dd>
            <dt>Crew</dt><dd>${s.crewMin ?? '—'}${s.crewMax && s.crewMax !== s.crewMin ? `–${s.crewMax}` : ''}</dd>
            <dt>Cargo</dt><dd class="mono">${s.cargo != null ? `${fmt(s.cargo)} SCU` : '—'}</dd>
            ${s.ore ? html`<dt>Ore hold</dt><dd class="mono">${fmt(s.ore)} SCU</dd>` : ''}
            ${s.inventory ? html`<dt>Personal storage</dt><dd class="mono">${fmt(s.inventory, 2)} SCU</dd>` : ''}
            ${s.beds ? html`<dt>Beds</dt><dd>${s.beds} (you can log out here)</dd>` : ''}
            ${s.medTier ? html`<dt>Medical bed</dt><dd>Tier ${s.medTier}</dd>` : ''}
            <dt>Quantum speed</dt><dd class="mono">${s.qtSpeed ? `${fmt(s.qtSpeed)} km/s` : '—'}</dd>
            <dt>QT spool</dt><dd class="mono">${s.qtSpool ? `${s.qtSpool} s` : '—'}</dd>
            <dt>Shield type</dt><dd>${s.shieldType || '—'}</dd>
            ${s.turrets ? html`<dt>Turrets</dt><dd>${s.turrets}</dd>` : ''}
            <dt>Insurance claim</dt><dd>${s.claim ? `${fmt(s.claim, 1)} min` : '—'}${s.expedite ? html`<span class="sub">Expedite: ${fmt(s.expedite, 1)} min for ${auec(s.expediteCost)}</span>` : ''}</dd>
          </dl>
        </div>
        <div class="panel">
          <h2>Pledge store</h2>
          <dl class="kv">
            <dt>Standalone price</dt><dd class="mono">${s.msrp ? usd(s.msrp) : '—'}</dd>
            ${s.warbond ? html`<dt>Warbond</dt><dd class="mono">${usd(s.warbond)}</dd>` : ''}
            <dt>For sale now</dt><dd>${s.pledgeAvailable ? 'Yes' : 'Not currently'}</dd>
            ${s.loaners?.length ? html`<dt>Loaners</dt><dd>${s.loaners.join(', ')}</dd>` : ''}
            ${s.added ? html`<dt>Added</dt><dd>${s.added}</dd>` : ''}
          </dl>
          <p class="muted" style="margin-top:10px;font-size:.88rem">Pledging is optional. Everything sold for aUEC can be earned by playing. <a href="#/pledge">All pledge prices</a></p>
        </div>
        <div class="panel">
          <h3 style="margin-bottom:8px">Links</h3>
          <div class="link-list">
            ${s.pledgeUrl ? html`<a href="${s.pledgeUrl}" target="_blank" rel="noopener noreferrer"><span>RSI pledge page</span>${icon('ext')}</a>` : ''}
            ${s.trailer ? html`<a href="${s.trailer}" target="_blank" rel="noopener noreferrer"><span>Watch the trailer</span>${icon('play')}</a>` : ''}
            ${s.brochure ? html`<a href="${s.brochure}" target="_blank" rel="noopener noreferrer"><span>Official brochure (PDF)</span>${icon('ext')}</a>` : ''}
            ${s.wikiPage ? html`<a href="${s.wikiPage}" target="_blank" rel="noopener noreferrer"><span>Star Citizen Wiki article</span>${icon('ext')}</a>` : ''}
            <a href="https://www.erkul.games/" target="_blank" rel="noopener noreferrer"><span>Plan a loadout (Erkul)</span>${icon('ext')}</a>
          </div>
        </div>
      </div>
    </div>
  `);
  setupViews(s);
  const top = document.getElementById('ship-top');
  if (matchMedia('(max-width: 820px)').matches) top.style.gridTemplateColumns = 'minmax(0,1fr)';
  document.getElementById('add-fleet').addEventListener('click', e => {
    addShip(s.id);
    toast(`${s.name} added to your fleet`);
    e.currentTarget.innerHTML = `Added (${fleetCount(s.id)} owned)`;
  });
  document.getElementById('cmp').addEventListener('click', e => {
    const list = toggleCompare(s.id);
    e.currentTarget.textContent = list.includes(s.id) ? 'Remove from compare' : 'Compare';
    if (list.includes(s.id)) toast(`Comparing ${list.length} ship${list.length > 1 ? 's' : ''}. Open "Compare" from the ships list.`);
  });
}

// Average colour of an image's visible pixels (used to paint the untextured 3D mesh).
async function sampleColor(url) {
  if (!url) return null;
  const { loadImage } = await import('../studio/render.js');
  const im = await loadImage(url);
  if (!im) return null;
  const c = document.createElement('canvas');
  c.width = 64; c.height = Math.max(1, Math.round(64 * im.naturalHeight / im.naturalWidth));
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3], lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (a < 200 || lum < 25 || lum > 245) continue; // skip background, shadows and glare
    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
  }
  if (n < 20) return null;
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

// Blueprint (top + side renders with dimensions), 3D model, and paints gallery.
function setupViews(s) {
  const tabs = document.getElementById('vtabs');
  const body = document.getElementById('vbody');
  if (!tabs || !body) return;
  let viewer = null;
  const show = async v => {
    viewer?.dispose(); viewer = null;
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    if (v === 'ingame') {
      const ANG = [['isometric', 'Isometric'], ['above', 'Above'], ['port', 'Side'], ['front', 'Front'], ['rear', 'Rear'], ['below', 'Below']];
      const sets = [['Standard', s.views], ...Object.entries(s.paintViews || {}).sort((a, b) => a[0].localeCompare(b[0]))].filter(([, v2]) => v2 && Object.keys(v2).length);
      let set = 0, angle = ANG.find(([k]) => s.views[k])?.[0] || 'isometric';
      const drawIg = () => {
        const views = sets[set][1];
        if (!views[angle]) angle = ANG.find(([k]) => views[k])?.[0];
        const cur = views[angle];
        render(body, html`
          ${sets.length > 1 ? html`<div class="field" style="margin-bottom:10px"><label for="ig-paint">Paint</label><select id="ig-paint">${sets.map(([n], i) => html`<option value="${i}" ${i === set ? 'selected' : ''}>${n}</option>`)}</select></div>` : ''}
          <button type="button" class="ig-main" id="ig-open" title="Open full screen and zoom"><img src="${cur.url}" alt="${s.name} ${sets[set][0]} paint, ${angle} view" loading="eager" referrerpolicy="no-referrer"><span class="ig-hint">${icon('search')} Click to zoom (up to 4K)</span></button>
          <div class="ig-thumbs">${ANG.filter(([k]) => views[k]).map(([k, l]) => html`<button type="button" data-a="${k}" class="${k === angle ? 'on' : ''}"><img src="${views[k].url}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>${l}</span></button>`)}</div>
          ${s.viewsFrom ? html`<p class="callout callout-tip" style="margin-top:10px">${icon('info')}<span>No screenshots of the ${s.name} yet, so these show the ${s.viewsFrom}, which shares its hull.</span></p>` : ''}
          <p class="muted" style="font-size:.85rem;margin-top:8px">In-game screenshots from the <a href="${s.wikiPage || 'https://starcitizen.tools/'}" target="_blank" rel="noopener noreferrer">Star Citizen Wiki</a>${sets.length > 1 ? `, with ${sets.length - 1} paint${sets.length > 2 ? 's' : ''} to compare` : ''}.</p>`);
        body.querySelector('.ig-thumbs').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { angle = b.dataset.a; drawIg(); } });
        document.getElementById('ig-paint')?.addEventListener('change', e => { set = +e.target.value; drawIg(); });
        document.getElementById('ig-open').addEventListener('click', () => openZoom(cur.url, `${s.name} · ${sets[set][0]} · ${ANG.find(a => a[0] === angle)[1]}`, cur.full));
      };
      drawIg();
    } else if (v === 'blueprint') {
      const painted = !!(s.topC || s.sideC);
      const approx = !painted && !!(s.top || s.side);
      const drawBp = useC => {
        const top = useC && s.topC ? [s.topC, s.topCHi] : [s.top, s.topHi];
        const side = useC && s.sideC ? [s.sideC, s.sideCHi] : [s.side, s.sideHi];
        render(body, html`
        ${painted || approx ? html`<div class="seg" id="bp-mode" style="margin-bottom:10px"><button type="button" data-c="1" class="${useC ? 'on' : ''}">${painted ? 'Textured' : 'Colour (approx.)'}</button><button type="button" data-c="0" class="${useC ? '' : 'on'}">Plain hull</button></div>` : ''}
        <div class="blueprint ${approx && useC ? 'bp-approx' : ''}" style="--hull:${paintFor(s)}">
        ${top[0] ? html`<figure class="bp-view">
          <div class="bp-img"><a href="${top[1] || top[0]}" target="_blank" rel="noopener noreferrer" title="Open full resolution"><img src="${top[0]}" alt="${s.name} seen from above" loading="lazy" crossorigin="anonymous">${approx && useC ? html`<span class="bp-tint" style="-webkit-mask-image:url('${top[0]}');mask-image:url('${top[0]}')"></span>` : ''}</a></div>
          <figcaption><span>Top</span><span class="mono">${fmt(s.length, 1)} m long · ${fmt(s.beam, 1)} m wide</span></figcaption></figure>` : ''}
        ${side[0] ? html`<figure class="bp-view">
          <div class="bp-img"><a href="${side[1] || side[0]}" target="_blank" rel="noopener noreferrer" title="Open full resolution"><img src="${side[0]}" alt="${s.name} seen from the side" loading="lazy" crossorigin="anonymous">${approx && useC ? html`<span class="bp-tint" style="-webkit-mask-image:url('${side[0]}');mask-image:url('${side[0]}')"></span>` : ''}</a></div>
          <figcaption><span>Side</span><span class="mono">${fmt(s.height, 1)} m tall</span></figcaption></figure>` : ''}
        ${useC && s.angleC ? html`<figure class="bp-view">
          <div class="bp-img"><img src="${s.angleC}" alt="${s.name} three-quarter view" loading="lazy" crossorigin="anonymous"></div>
          <figcaption><span>Angled</span><span class="mono">${s.maker || ''}</span></figcaption></figure>` : ''}
      </div><p class="muted" style="font-size:.85rem;margin-top:8px">${painted ? '' : approx && useC ? 'No official painted render exists for this ship, so it is shown in its manufacturer\'s usual hull colour (approximate). ' : ''}Click a view to open the full-resolution render. Renders from <a href="${s.fleetyards || 'https://fleetyards.net'}" target="_blank" rel="noopener noreferrer">FleetYards</a>.</p>`);
        document.getElementById('bp-mode')?.addEventListener('click', e => { const b = e.target.closest('button'); if (b) drawBp(b.dataset.c === '1'); });
      };
      drawBp(painted || approx);
    } else if (v === '3d') {
      render(body, html`<div class="viewer3d" id="v3d"><div class="v3d-status" id="v3d-status">Loading 3D model…</div>
        <div class="lineup-tools"><div class="seg" id="v3d-mode"><button type="button" data-m="paint" class="on">Painted</button><button type="button" data-m="real">Plain</button><button type="button" data-m="holo">Hologram</button></div>
        <button class="btn btn-sm" type="button" id="v3d-spin">Pause spin</button><button class="btn btn-sm" type="button" id="v3d-full">Full screen</button></div></div>
        <p class="muted" style="font-size:.85rem;margin-top:8px">Drag to rotate, scroll or pinch to zoom, right-drag to pan. Grid squares are 10 m. Model from <a href="${s.fleetyards || 'https://fleetyards.net'}" target="_blank" rel="noopener noreferrer">FleetYards</a>. Public 3D models have no textures, so "Painted" uses the ship's main hull colour (from its painted render, or its manufacturer's usual colour).</p>`);
      const host = document.getElementById('v3d');
      const status = document.getElementById('v3d-status');
      try {
        const { mountViewer } = await import('../viewer3d.js');
        if (!host.isConnected) return;
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f0a33a';
        // Colour from the official painted render when there is one, otherwise the maker's usual hull colour.
        const paint = (s.angleC || s.sideC ? await sampleColor(s.angleC || s.sideC).catch(() => null) : null) || paintFor(s);
        viewer = mountViewer(host, { url: s.holo, length: s.length || 20, accent, paint, onProgress: (p, bytes) => { status.textContent = p ? `Loading 3D model… ${Math.round(p * 100)}%` : `Loading 3D model… ${(bytes / 1e6).toFixed(1)} MB`; } });
        await viewer.ready;
        status.hidden = true;
      } catch (e) {
        status.textContent = `Couldn't load the 3D model (${e.message || 'network error'}).`;
      }
      document.getElementById('v3d-mode')?.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !viewer) return;
        viewer.setMode(b.dataset.m);
        document.querySelectorAll('#v3d-mode button').forEach(x => x.classList.toggle('on', x === b));
      });
      let spinning = true;
      document.getElementById('v3d-spin')?.addEventListener('click', e => { spinning = !spinning; viewer?.setAutoRotate(spinning); e.currentTarget.textContent = spinning ? 'Pause spin' : 'Spin'; });
      document.getElementById('v3d-full')?.addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen?.() : host.requestFullscreen?.().catch(() => toast('Full screen is not available here', 'warn')); });
    } else if (v === 'paints') {
      render(body, html`<div class="loading">Loading paints…</div>`);
      const paints = (await load('paints').catch(() => [])).filter(p => p.ship === s.id);
      render(body, paints.length ? html`<div class="cards">${paints.map(p => html`
        <a class="card" href="${p.imgFull || p.img || '#'}" target="_blank" rel="noopener noreferrer">
          <div class="card-media">${img(p.img, p.name)}</div>
          <div class="card-body"><div class="card-title" style="font-size:.95rem">${p.name}</div></div>
        </a>`)}</div><p class="muted" style="font-size:.85rem;margin-top:8px">Paint images from <a href="https://fleetyards.net" target="_blank" rel="noopener noreferrer">FleetYards</a>. Paints are sold on the pledge store, in game, or given at events.</p>` : html`<p class="muted">No paints on record for this ship.</p>`);
    }
  };
  tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) show(b.dataset.v); });
  show(tabs.querySelector('button.on')?.dataset.v || tabs.querySelector('button')?.dataset.v);
}

function compare(main, all) {
  const ships = getCompare().map(id => all.find(s => s.id === id)).filter(Boolean);
  if (!ships.length) {
    render(main, html`<div class="empty"><h2>Nothing to compare yet</h2><p>On the <a href="#/ships">ships list</a>, press the scale button on up to 4 ships.</p></div>`);
    return;
  }
  const rows = [
    ['In-game price', s => s.buy?.[0]?.price, v => auec(v), 'low'],
    ['Pledge price', s => s.msrp, v => usd(v), 'low'],
    ['Cargo (SCU)', s => s.cargo, v => fmt(v), 'high'],
    ['Crew', s => s.crewMax, v => fmt(v), null],
    ['Length (m)', s => s.length, v => fmt(v, 1), null],
    ['SCM speed', s => s.scm, v => fmt(v), 'high'],
    ['Max speed', s => s.maxSpeed, v => fmt(v), 'high'],
    ['Pitch / yaw / roll', s => s.pitch, (v, s) => `${fmt(s.pitch)} / ${fmt(s.yaw)} / ${fmt(s.roll)}`, 'high'],
    ['Hull HP', s => s.hp, v => fmt(v), 'high'],
    ['Shield HP', s => s.shield, v => fmt(v), 'high'],
    ['Pilot DPS', s => s.dps, v => fmt(v), 'high'],
    ['Missiles', s => s.missiles, v => fmt(v), 'high'],
    ['Quantum range (Gm)', s => s.qtRange, v => fmt(v, 1), 'high'],
    ['Quantum speed (km/s)', s => s.qtSpeed, v => fmt(v), 'high'],
    ['Insurance claim (min)', s => s.claim, v => fmt(v, 1), 'low'],
  ];
  render(main, html`
    <div class="crumbs"><a href="#/ships">Ships</a> / Compare</div>
    <div class="page-head"><span class="eyebrow">Side by side</span><h1>Compare ships</h1></div>
    <div class="table-wrap">
      <table>
        <thead><tr><th></th>${ships.map(s => html`<th style="min-width:180px"><a href="#/ships/${s.id}" style="font-size:.95rem;letter-spacing:0;text-transform:none;font-family:var(--body)">${s.name}</a><span class="sub" style="text-transform:none;letter-spacing:0">${s.maker || ''}</span></th>`)}</tr></thead>
        <tbody>
          <tr><td></td>${ships.map(s => html`<td><div class="card-media" style="border-radius:6px">${img(s.img, s.name)}</div></td>`)}</tr>
          ${rows.map(([label, get, show, better]) => {
            const vals = ships.map(get).filter(v => v != null && v !== 0);
            const best = better === 'high' ? Math.max(...vals) : better === 'low' ? Math.min(...vals) : null;
            return html`<tr><td class="muted">${label}</td>${ships.map(s => {
              const v = get(s);
              const win = best !== null && v === best && vals.length > 1;
              return html`<td class="num" style="${win ? 'color:var(--accent);font-weight:600' : ''}">${v != null && v !== 0 ? show(v, s) : '—'}</td>`;
            })}</tr>`;
          })}
          <tr><td class="muted">Where to buy</td>${ships.map(s => html`<td style="font-size:.85rem">${s.buy?.length ? s.buy.map(b => b.place).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'Pledge only'}</td>`)}</tr>
          <tr><td></td>${ships.map(s => html`<td><button class="btn btn-sm btn-ghost" data-rm="${s.id}" type="button">Remove</button></td>`)}</tr>
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin-top:10px">Best value in each row is highlighted.</p>
  `);
  main.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { toggleCompare(b.dataset.rm); compare(main, all); }));
}

export { systemClass };
