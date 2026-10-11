import { html, render, icon, load, fmt, usd, norm, img, errorBox } from '../lib.js';

// Kind of store listing, from its RSI URL.
export const skuKind = s => {
  const u = s.url || '';
  if (/\/Upgrades\//i.test(u)) return 'Upgrade (CCU)';
  if (/\/Packages?\//i.test(u) || s.pkg) return 'Package';
  if (/\/Paints?\//i.test(u)) return 'Paint';
  return 'Standalone ship';
};

export function skuTable(skus) {
  return html`<div class="table-wrap"><table>
    <thead><tr><th>Listing</th><th>Type</th><th class="r">Price</th><th>Status</th></tr></thead>
    <tbody>${skus.map(s => html`<tr>
      <td>${s.url ? html`<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title.trim()}</a>` : s.title}</td>
      <td>${skuKind(s)}${s.warbond ? html` <span class="chip chip-accent">Warbond</span>` : ''}</td>
      <td class="r num">${s.sale ? html`<s class="muted">${usd(s.price)}</s> ${usd(s.sale)}` : usd(s.price)}</td>
      <td>${s.avail ? html`<span class="chip chip-live">For sale now</span>` : html`<span class="chip">Last seen ${s.seen || '—'}</span>`}</td>
    </tr>`)}</tbody></table></div>`;
}

export default async function pledge(main, ctx) {
  let ships;
  try { ships = await load('ships'); } catch (e) { render(main, errorBox(e)); return; }
  const rows = ships.flatMap(s => (s.skus || []).map(k => ({ ...k, ship: s, kind: skuKind(k) })));
  const state = { q: ctx.params.q || '', kind: ctx.params.kind || '', status: ctx.params.status || 'now', warbond: ctx.params.warbond === '1', sort: 'price' };
  const kinds = [...new Set(rows.map(r => r.kind))].sort();

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Real-money store</span>
      <h1>Pledge store prices</h1>
      <p class="lede">What every ship costs in US dollars on the RSI pledge store, including warbond deals (cheaper, paid with new money only), upgrades (CCUs) and game packages. Pledging is optional: every ship you can buy with aUEC in game is listed on its ship page.</p>
    </div>
    <div class="callout callout-tip" style="margin-bottom:16px">${icon('info')}<span><b>Warbond</b> listings must be paid with new money, not store credit, and are usually cheaper. <b>Upgrades (CCUs)</b> turn a ship you own into another; the price shown is the listing price RSI publishes. Prices exclude VAT/sales tax. Sales and limited ships come and go, so "Last seen" shows the most recent price on record.</span></div>
    <div class="filters">
      <div class="field field-grow"><label for="pq">Search</label><input id="pq" type="search" placeholder="Ship or package name" value="${state.q}"></div>
      <div class="field"><label for="pkind">Listing type</label><select id="pkind"><option value="">All types</option>${kinds.map(k => html`<option ${k === state.kind ? 'selected' : ''}>${k}</option>`)}</select></div>
      <div class="field"><span class="lbl">Availability</span><div class="seg" id="pstatus">
        <button type="button" data-v="now" class="${state.status === 'now' ? 'on' : ''}">For sale now</button>
        <button type="button" data-v="past" class="${state.status === 'past' ? 'on' : ''}">Not on sale</button>
        <button type="button" data-v="" class="${state.status === '' ? 'on' : ''}">All</button></div></div>
      <div class="field"><label for="psort">Sort</label><select id="psort"><option value="price">Cheapest first</option><option value="price-desc">Most expensive first</option><option value="name">Name</option></select></div>
      <label class="check"><input type="checkbox" id="pwb" ${state.warbond ? 'checked' : ''}> Warbond only</label>
    </div>
    <div class="stat-row" id="pstats" style="margin-bottom:16px"></div>
    <div class="result-count" id="pcount"></div>
    <div class="table-wrap"><table>
      <thead><tr><th></th><th>Ship</th><th>Listing</th><th>Type</th><th class="r">USD</th><th class="r">In game</th><th>Status</th></tr></thead>
      <tbody id="pbody"></tbody>
    </table></div>
  `);
  const $ = id => document.getElementById(id);
  function apply() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    const list = rows.filter(r => {
      if (state.kind && r.kind !== state.kind) return false;
      if (state.status === 'now' && !r.avail) return false;
      if (state.status === 'past' && r.avail) return false;
      if (state.warbond && !r.warbond) return false;
      if (q.length && !q.every(w => norm(`${r.title} ${r.ship.name} ${r.ship.maker}`).includes(w))) return false;
      return true;
    });
    const eff = r => r.sale || r.price;
    list.sort(state.sort === 'name' ? (a, b) => a.ship.name.localeCompare(b.ship.name) : state.sort === 'price-desc' ? (a, b) => eff(b) - eff(a) : (a, b) => eff(a) - eff(b));
    const standalone = list.filter(r => r.kind === 'Standalone ship');
    render($('pstats'), html`
      <div class="stat"><span>Listings</span><b>${fmt(list.length)}</b></div>
      <div class="stat"><span>Ships covered</span><b>${fmt(new Set(list.map(r => r.ship.id)).size)}</b></div>
      <div class="stat hi"><span>Cheapest ship</span><b>${standalone.length ? usd(Math.min(...standalone.map(eff))) : '—'}</b></div>
      <div class="stat"><span>Warbond deals</span><b>${fmt(list.filter(r => r.warbond).length)}</b></div>`);
    $('pcount').textContent = `${fmt(list.length)} listings`;
    render($('pbody'), list.length ? list.slice(0, 400).map(r => html`<tr>
      <td style="width:72px"><span class="thumb" style="display:block">${img(r.ship.img, r.ship.name)}</span></td>
      <td><a href="#/ships/${r.ship.id}"><b>${r.ship.name}</b></a><span class="sub">${r.ship.maker || ''}</span></td>
      <td>${r.url ? html`<a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title.trim()}</a>` : r.title}</td>
      <td>${r.kind}${r.warbond ? html` <span class="chip chip-accent">Warbond</span>` : ''}</td>
      <td class="r num">${r.sale ? html`<s class="muted">${usd(r.price)}</s><br>${usd(r.sale)}` : usd(r.price)}</td>
      <td class="r num">${r.ship.buy?.length ? `${fmt(r.ship.buy[0].price)}` : html`<span class="muted">—</span>`}</td>
      <td>${r.avail ? html`<span class="chip chip-live">On sale</span>` : html`<span class="chip">Seen ${r.seen || '—'}</span>`}</td>
    </tr>`) : html`<tr><td colspan="7"><div class="empty" style="border:0">No listings match these filters.</div></td></tr>`);
  }
  $('pq').addEventListener('input', e => { state.q = e.target.value; apply(); });
  $('pkind').addEventListener('change', e => { state.kind = e.target.value; apply(); });
  $('psort').addEventListener('change', e => { state.sort = e.target.value; apply(); });
  $('pwb').addEventListener('change', e => { state.warbond = e.target.checked; apply(); });
  $('pstatus').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.status = b.dataset.v;
    document.querySelectorAll('#pstatus button').forEach(x => x.classList.toggle('on', x === b));
    apply();
  });
  apply();
}
