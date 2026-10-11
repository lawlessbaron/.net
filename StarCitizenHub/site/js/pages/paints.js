import { html, render, load, fmt, norm, img, errorBox } from '../lib.js';

const PAGE = 60;

export default async function paints(main, ctx) {
  let all, ships;
  try { [all, ships] = await Promise.all([load('paints'), load('ships')]); } catch (e) { render(main, errorBox(e)); return; }
  const byId = new Map(ships.map(s => [s.id, s]));
  const makers = [...new Set(all.map(p => byId.get(p.ship)?.maker).filter(Boolean))].sort();
  const state = { q: ctx.params.q || '', maker: '', count: PAGE };

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Livery locker</span>
      <h1>Paints</h1>
      <p class="lede">Every paint and livery for every ship, ${fmt(all.length)} in total. Search by paint name (like "Best in Show" or "Luminalia") or by ship.</p>
    </div>
    <div class="filters">
      <div class="field field-grow"><label for="paq">Search</label><input id="paq" type="search" placeholder="Paint or ship name" value="${state.q}"></div>
      <div class="field"><label for="pamaker">Manufacturer</label><select id="pamaker"><option value="">All makers</option>${makers.map(m => html`<option>${m}</option>`)}</select></div>
    </div>
    <div class="result-count" id="pacount"></div>
    <div class="cards" id="pacards"></div>
    <div class="more" id="pamore"></div>
  `);
  const $ = id => document.getElementById(id);
  function apply() {
    const q = norm(state.q).split(/\s+/).filter(Boolean);
    const list = all.filter(p => {
      const s = byId.get(p.ship);
      if (state.maker && s?.maker !== state.maker) return false;
      return !q.length || q.every(w => norm(`${p.name} ${s?.name} ${s?.maker}`).includes(w));
    });
    $('pacount').textContent = `${fmt(list.length)} paints`;
    render($('pacards'), list.slice(0, state.count).map(p => {
      const s = byId.get(p.ship);
      return html`<a class="card" href="#/ships/${p.ship}">
        <div class="card-media">${img(p.img, p.name)}</div>
        <div class="card-body"><div class="card-title" style="font-size:.98rem">${p.name}</div><div class="card-sub">${s?.name || p.ship}${s?.maker ? ` · ${s.maker}` : ''}</div></div>
      </a>`;
    }));
    render($('pamore'), list.length > state.count ? html`<button class="btn" id="pamore-btn">Show more</button>` : '');
    $('pamore-btn')?.addEventListener('click', () => { state.count += PAGE; apply(); });
  }
  $('paq').addEventListener('input', e => { state.q = e.target.value; state.count = PAGE; apply(); });
  $('pamaker').addEventListener('change', e => { state.maker = e.target.value; state.count = PAGE; apply(); });
  apply();
}
