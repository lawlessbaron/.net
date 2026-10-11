import { html, render, icon, load, fmt, auec, usd, norm, img, store, toast, copy, errorBox } from '../lib.js';
import { getFleet, saveFleet, addShip, removeShip } from '../fleetstore.js';
import { session } from '../account.js';
import { recolour, paintFor, cutout, relayed, wikiWidth } from '../shipart.js';

// Example fleet shown (and clearly labelled) until the user adds their own ships.
const EXAMPLE = ['Avenger Titan', 'Cutlass Black', 'Prospector', 'Vulture', 'Freelancer MAX', 'C2 Hercules Starlifter', 'Carrack', 'Ursa', '890 Jump', 'Pisces C8X Expedition'];

const CAREER_COLOR = {
  Combat: '--bad', Transporter: '--stanton', Industrial: '--warn', Exploration: '--nyx', Support: '--good',
  Competition: '--pyro', 'Multi-Role': '--accent', Ground: '--signal',
};
const careerOf = s => (s.ground ? 'Ground' : s.career || 'Multi-Role');
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';

// Roles a well-rounded fleet covers, matched against ship text.
const ROLES = [
  ['Combat', /combat|fighter|gunship|interceptor|bomber|heavy fighter/i],
  ['Cargo hauling', /cargo|freight|transport|hauler/i],
  ['Mining', /mining/i],
  ['Salvage', /salvage/i],
  ['Medical', /medic|medical|rescue/i],
  ['Refueling', /refuel/i],
  ['Exploration', /explor|pathfinder|expedition/i],
  ['Passenger / touring', /touring|passenger|luxury/i],
  ['Racing', /racing|competition/i],
  ['Ground vehicle', null],
];

let resolved = null; // [{entry, ship}]

export default async function fleet(main, ctx = {}) {
  let ships;
  try { ships = await load('ships'); } catch (e) { render(main, errorBox(e)); return; }
  const byId = new Map(ships.map(s => [s.id, s]));
  if (ctx.variant === 'public') return publicFleet(main, ctx.id, byId, ships);
  const findByName = makeMatcher(ships);

  const state = { view: store.get('fleetView', 'lineup') };
  const draw = () => {
    const entries = getFleet();
    const isExample = entries.length === 0;
    const list = isExample
      ? EXAMPLE.map(n => findByName(n)).filter(Boolean).map((s, i) => ({ entry: { uid: `ex${i}`, shipId: s.id }, ship: s }))
      : entries.map(e => ({ entry: e, ship: byId.get(e.shipId) })).filter(x => x.ship);
    resolved = list;
    const verified = session.user?.rsiHandle ? { ...(session.user.rsiCard || {}), handle: session.user.rsiHandle, url: `https://robertsspaceindustries.com/citizens/${session.user.rsiHandle}`, verified: true } : null;
    const account = verified || store.get('account', null);

    render(main, html`
      <div class="page-head">
        <span class="eyebrow">Your hangar</span>
        <h1>My fleet</h1>
        <p class="lede">Link your RSI handle, bring in your hangar, and see every ship you own lined up to scale with what your fleet can and can't do. Everything is saved in this browser only.</p>
      </div>

      <div class="grid g2" style="margin-bottom:18px">
        ${accountPanel(account)}
        <div class="panel">
          <div class="panel-title"><h2>Add ships</h2><button class="btn btn-sm" type="button" id="open-import">${icon('box')} Import hangar</button></div>
          <div class="field" style="position:relative">
            <label for="add-q">Search a ship to add</label>
            <input id="add-q" type="search" placeholder="e.g. Cutlass, Prospector, Carrack" autocomplete="off" style="width:100%">
            <div id="add-results" class="link-list" style="margin-top:6px"></div>
          </div>
        </div>
      </div>

      <div id="import-box" class="panel" style="margin-bottom:18px" hidden></div>

      ${isExample ? html`<div class="callout callout-tip" style="margin-bottom:14px">${icon('info')}<span><b>This is an example fleet</b> so you can see how it works. Add a ship or import your hangar and it will be replaced with yours.</span></div>` : ''}

      <div class="stat-row" style="margin-bottom:16px">${summary(list)}</div>

      <div class="fleet-tabs seg" id="fleet-tabs">
        ${[['lineup', 'Hangar lineup'], ['3d', '3D hangar'], ['cards', 'Ships'], ['stats', 'Fleet analysis']].map(([v, l]) => html`<button type="button" data-v="${v}" class="${state.view === v ? 'on' : ''}">${l}</button>`)}
      </div>
      <a class="btn btn-sm" href="#/studio?t=fleet" style="margin-left:8px;vertical-align:top">${icon('play')} Make a share image</a>
      <div id="fleet-view"></div>

      ${!isExample ? html`<div class="panel" style="margin-top:18px">
        <div class="panel-title"><h2>Back up or share</h2></div>
        <p class="muted" style="margin-bottom:10px">Your fleet lives in this browser. Copy the fleet code to move it to another device or send it to a friend.</p>
        <div class="hero-actions">
          <button class="btn" type="button" id="copy-code">${icon('link')} Copy fleet code</button>
          <button class="btn btn-ghost" type="button" id="clear-fleet">${icon('trash')} Remove all ships</button>
          <span id="clear-confirm"></span>
        </div>
      </div>` : ''}
    `);
    bindTop(isExample);
    drawView();
  };

  function drawView() {
    const host = document.getElementById('fleet-view');
    if (!host) return;
    const isExample = getFleet().length === 0;
    if (state.view === 'cards') return cardsView(host, isExample);
    if (state.view === 'stats') return statsView(host, ships);
    if (state.view === '3d') return hangar3d(host);
    return lineupView(host);
  }

  function cardsView(host, isExample) {
    const list = resolved;
    render(host, html`<div class="rows fleet-list">${list.map(({ entry, ship: s }) => html`
      <div class="row">
        <a class="thumb" href="#/ships/${s.id}">${img(s.img, s.name)}</a>
        <span style="display:grid;gap:3px;min-width:0">
          <a href="#/ships/${s.id}" class="row-title" style="color:var(--fg)">${entry.name || s.name}</a>
          <span class="row-meta"><span>${s.maker || ''}</span><span>${s.role || s.career || ''}</span>
            ${entry.insurance ? html`<span class="chip chip-accent">${entry.insurance}</span>` : ''}
            ${entry.pledge ? html`<span class="chip">${entry.pledge}</span>` : ''}</span>
        </span>
        <span class="row-side">
          <span class="mono" style="font-size:.85rem">${s.cargo ? `${fmt(s.cargo)} SCU` : ''}</span>
          ${isExample ? '' : html`<button class="btn btn-sm btn-ghost" type="button" data-remove="${entry.uid}" aria-label="Remove ${s.name}">${icon('x')}</button>`}
        </span>
      </div>`)}</div>`);
    host.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { removeShip(b.dataset.remove); toast('Removed'); draw(); }));
  }

  function bindTop(isExample) {
    document.getElementById('fleet-tabs').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state.view = b.dataset.v; store.set('fleetView', state.view);
      document.querySelectorAll('#fleet-tabs button').forEach(x => x.classList.toggle('on', x === b));
      drawView();
    });
    // Add ship search
    const q = document.getElementById('add-q');
    const res = document.getElementById('add-results');
    q.addEventListener('input', () => {
      const t = norm(q.value.trim());
      if (!t) { render(res, ''); return; }
      const hits = ships.filter(s => norm(`${s.name} ${s.fullName} ${s.maker}`).includes(t)).slice(0, 6);
      render(res, hits.length ? hits.map(s => html`<a href="#/fleet" data-add="${s.id}"><span>${s.name}<small>${s.maker || ''}</small></span>${icon('plus')}</a>`) : html`<span class="muted" style="padding:6px 10px">No ship called "${q.value}"</span>`);
    });
    res.addEventListener('click', e => {
      const a = e.target.closest('[data-add]'); if (!a) return;
      e.preventDefault();
      addShip(a.dataset.add);
      toast(`${byId.get(a.dataset.add)?.name} added`);
      draw();
    });
    // Account
    accountBind(draw);
    // Import
    document.getElementById('open-import').addEventListener('click', () => {
      const box = document.getElementById('import-box');
      box.hidden = !box.hidden;
      if (!box.hidden) importPanel(box, ships, findByName, draw);
    });
    if (!isExample) {
      document.getElementById('copy-code').addEventListener('click', () => {
        const code = 'VA1:' + btoa(unescape(encodeURIComponent(JSON.stringify(getFleet().map(e => [e.shipId, e.name || '', e.insurance || ''])))));
        copy(code, 'Fleet code copied. Paste it into Import on another device.');
      });
      document.getElementById('clear-fleet').addEventListener('click', () => {
        render(document.getElementById('clear-confirm'), html`<span class="muted">Remove all ${getFleet().length} ships?</span> <button class="btn btn-sm" type="button" id="clear-yes" style="border-color:var(--bad);color:var(--bad)">Yes, remove</button>`);
        document.getElementById('clear-yes').addEventListener('click', () => { saveFleet([]); toast('Fleet cleared'); draw(); });
      });
    }
  }

  draw();
}

// ---------------------------------------------------------------- public fleet page (#/u/handle)
async function publicFleet(main, handle, byId, ships) {
  render(main, html`<div class="loading">Loading ${handle}'s fleet…</div>`);
  let prof;
  try {
    const r = await fetch(`api/u/${encodeURIComponent(handle)}`);
    prof = r.ok ? await r.json() : null;
  } catch { prof = null; }
  if (!prof) {
    render(main, html`<div class="empty"><h2>No public fleet for ${handle}</h2><p>They haven't shared their fleet here, or the handle is wrong. <a href="#/fleet">Build your own fleet</a></p></div>`);
    return;
  }
  const c = prof.card || {};
  resolved = (prof.fleet || []).map(e => ({ entry: e, ship: byId.get(e.shipId) })).filter(x => x.ship);
  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Public fleet</span>
      <div class="profile-card">
        ${c.avatar ? html`<img class="avatar" src="${c.avatar}" alt="" referrerpolicy="no-referrer">` : html`<div class="avatar">${prof.handle.slice(0, 1).toUpperCase()}</div>`}
        <div style="display:grid;gap:4px;min-width:0"><h1 style="font-size:2rem">${c.moniker || prof.handle}</h1>
          <span class="muted mono">@${prof.handle} <span class="chip chip-live">Verified</span></span>
          <div class="chips">${c.org?.name ? html`<a class="chip chip-accent" href="${c.org.url}" target="_blank" rel="noopener noreferrer">${c.org.name}</a>` : ''}${c.enlisted ? html`<span class="chip">Enlisted ${c.enlisted}</span>` : ''}</div></div>
      </div>
    </div>
    <div class="stat-row" style="margin-bottom:16px">${summary(resolved)}</div>
    <div class="fleet-tabs seg" id="fleet-tabs">${[['lineup', 'Hangar lineup'], ['3d', '3D hangar'], ['stats', 'Fleet analysis'], ['list', 'Ships']].map(([v, l], i) => html`<button type="button" data-v="${v}" class="${i ? '' : 'on'}">${l}</button>`)}</div>
    <div id="fleet-view"></div>
    <p class="muted" style="margin-top:16px">Want a page like this? <a href="#/fleet">Build your fleet</a> and sign in to share it.</p>`);
  const host = document.getElementById('fleet-view');
  const show = v => {
    if (v === 'stats') return statsView(host, ships);
    if (v === '3d') return hangar3d(host);
    if (v === 'list') return render(host, html`<div class="cards">${resolved.map(({ entry, ship: s }) => html`<a class="card" href="#/ships/${s.id}"><div class="card-media">${img(s.img, s.name)}</div><div class="card-body"><div class="card-title">${entry.name || s.name}</div><div class="card-sub">${s.maker || ''}${entry.insurance ? ` · ${entry.insurance}` : ''}</div></div></a>`)}</div>`);
    return lineupView(host);
  };
  document.getElementById('fleet-tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#fleet-tabs button').forEach(x => x.classList.toggle('on', x === b));
    show(b.dataset.v);
  });
  show('lineup');
}

// ---------------------------------------------------------------- account
function accountPanel(acc) {
  if (!acc) {
    return html`<div class="panel">
      <div class="panel-title"><h2>Link your RSI account</h2></div>
      <p class="muted" style="margin-bottom:10px">Enter your RSI handle (the name in your profile URL) to show your citizen card and org.</p>
      <div class="filters" style="margin:0">
        <div class="field field-grow"><label for="handle">RSI handle</label><input id="handle" type="text" placeholder="e.g. croberts68" autocomplete="off" spellcheck="false"></div>
        <button class="btn btn-primary" id="link-btn" type="button">${icon('link')} Link</button>
      </div>
      <p class="muted" style="margin-top:10px;font-size:.85rem">CIG doesn't offer a public login or API for other sites, so we only read your <b>public</b> citizen page. We never ask for your password.</p>
    </div>`;
  }
  return html`<div class="panel">
    <div class="profile-card">
      ${acc.avatar ? html`<img class="avatar" src="${acc.avatar}" alt="" referrerpolicy="no-referrer">` : html`<div class="avatar">${(acc.handle || '?').slice(0, 1).toUpperCase()}</div>`}
      <div style="display:grid;gap:4px;min-width:0">
        <span class="eyebrow">${acc.badge || 'Citizen'}${acc.record ? ` · Record ${acc.record}` : ''}</span>
        <h2 style="overflow-wrap:anywhere">${acc.moniker || acc.handle}</h2>
        <span class="muted mono" style="font-size:.85rem">@${acc.handle}</span>
        <div class="chips">
          ${acc.enlisted ? html`<span class="chip">Enlisted ${acc.enlisted}</span>` : ''}
          ${acc.org?.name ? html`<a class="chip chip-accent" href="${acc.org.url}" target="_blank" rel="noopener noreferrer">${acc.org.name}${acc.org.rank ? ` · ${acc.org.rank}` : ''}</a>` : ''}
          ${acc.location ? html`<span class="chip">${acc.location}</span>` : ''}
        </div>
      </div>
    </div>
    ${acc.verified ? html`<p style="margin-top:10px;font-size:.88rem"><span class="chip chip-live">Verified</span> ${session.user?.publicFleet ? html`Your fleet is public: <a href="#/u/${acc.handle}">#/u/${acc.handle}</a>` : html`<a href="#/account">Make your fleet public</a> to share it.`}</p>` : ''}
    ${acc.offline ? html`<p class="muted" style="margin-top:10px;font-size:.85rem">Saved your handle. Live profile details need the Verse Atlas server (<span class="mono">npm start</span>); on a static host we can only link to your RSI page.</p>` : ''}
    <div class="hero-actions" style="margin-top:12px">
      <a class="btn btn-sm" href="${acc.url}" target="_blank" rel="noopener noreferrer">RSI profile ${icon('ext', 'i-sm')}</a>
      <a class="btn btn-sm" href="https://robertsspaceindustries.com/account/pledges" target="_blank" rel="noopener noreferrer">My hangar on RSI ${icon('ext', 'i-sm')}</a>
      ${acc.verified ? html`<a class="btn btn-sm btn-ghost" href="#/account">Account</a>` : html`<button class="btn btn-sm btn-ghost" type="button" id="refresh-acc">Refresh</button>
      <button class="btn btn-sm btn-ghost" type="button" id="unlink">Unlink</button>`}
    </div>
  </div>`;
}

async function fetchCitizen(handle) {
  const clean = handle.trim().replace(/^.*\/citizens\//i, '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!clean) throw new Error('Enter your RSI handle first.');
  try {
    const r = await fetch(`api/citizen/${encodeURIComponent(clean)}`);
    const type = r.headers.get('content-type') || '';
    if (r.status === 404 && type.includes('json')) throw Object.assign(new Error((await r.json()).error), { notFound: true });
    if (!r.ok || !type.includes('json')) throw new Error('no server');
    return await r.json();
  } catch (e) {
    if (e.notFound) throw e;
    // Static hosting: no lookup server. Keep the handle and link out.
    return { handle: clean, url: `https://robertsspaceindustries.com/citizens/${clean}`, offline: true };
  }
}

function accountBind(redraw) {
  const btn = document.getElementById('link-btn');
  if (btn) {
    const input = document.getElementById('handle');
    const go = async () => {
      btn.disabled = true; btn.textContent = 'Linking…';
      try { const acc = await fetchCitizen(input.value); store.set('account', acc); toast(acc.offline ? 'Handle saved' : `Welcome, ${acc.moniker || acc.handle}`); redraw(); }
      catch (e) { toast(e.message, 'warn'); btn.disabled = false; btn.textContent = 'Link'; }
    };
    btn.addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  document.getElementById('unlink')?.addEventListener('click', () => { store.set('account', null); redraw(); });
  document.getElementById('refresh-acc')?.addEventListener('click', async () => {
    const acc = store.get('account');
    try { store.set('account', await fetchCitizen(acc.handle)); toast('Profile refreshed'); redraw(); } catch (e) { toast(e.message, 'warn'); }
  });
}

// ---------------------------------------------------------------- import
// Bookmarklet: runs on robertsspaceindustries.com while logged in, reads the
// pledge list pages and copies the ships it finds as JSON.
const BOOKMARKLET_SRC = `(async()=>{if(!/robertsspaceindustries\\.com$/.test(location.hostname)){alert('Open robertsspaceindustries.com/account/pledges while logged in, then click this bookmark again.');return}const out=[];let last='';for(let p=1;p<=60;p++){const r=await fetch('/account/pledges?page='+p+'&pagesize=50',{credentials:'include'});const d=new DOMParser().parseFromString(await r.text(),'text/html');const li=[...d.querySelectorAll('.list-items > li')];if(!li.length)break;const sig=li[0].textContent.trim().slice(0,80);if(sig===last)break;last=sig;for(const x of li){const pledge=(x.querySelector('.js-pledge-name')||{}).value||'';const txt=x.textContent;const ins=/lifetime insurance|\\bLTI\\b/i.test(txt)?'LTI':((txt.match(/(\\d+)[- ]month insurance/i)||[])[1]?(txt.match(/(\\d+)[- ]month insurance/i)[1]+' months'):'');for(const it of x.querySelectorAll('.item')){const kind=(it.querySelector('.kind')||{}).textContent||'';const title=((it.querySelector('.title')||{}).textContent||'').trim();const maker=((it.querySelector('.liner span')||{}).textContent||'').trim();if(title&&/ship|vehicle/i.test(kind))out.push({name:title,maker,pledge,insurance:ins})}}}const json=JSON.stringify({source:'rsi-pledges',ships:out});try{await navigator.clipboard.writeText(json);alert('Copied '+out.length+' ships. Paste them into Verse Atlas > My fleet > Import hangar.')}catch(e){prompt('Copy this text and paste it into Verse Atlas:',json)}})()`;

function importPanel(box, ships, findByName, redraw) {
  render(box, html`
    <div class="panel-title"><h2>Import your hangar</h2><button class="btn btn-sm btn-ghost" type="button" id="close-import">${icon('x')} Close</button></div>
    <div class="grid g2">
      <div class="stack" style="gap:10px">
        <h3>Option 1 · One-click bookmark (beta)</h3>
        <ol class="step-text" style="padding-left:1.2em">
          <li>Drag this button to your bookmarks bar: <a class="btn btn-sm btn-primary" href="javascript:${encodeURI(BOOKMARKLET_SRC)}" id="bm" onclick="return false">Verse Atlas hangar export</a></li>
          <li>Go to <a href="https://robertsspaceindustries.com/account/pledges" target="_blank" rel="noopener noreferrer">your RSI hangar</a> and log in.</li>
          <li>Click the bookmark. It reads your pledge list in your own browser and copies your ships.</li>
          <li>Come back here and paste into the box.</li>
        </ol>
        <p class="muted" style="font-size:.85rem">Nothing is sent anywhere: the bookmark only reads the page you're on and copies text to your clipboard. Can't drag it? Copy the code below, open the browser console (F12) on your RSI hangar page, paste it and press Enter.</p>
        <button class="btn btn-sm" type="button" id="copy-bm">${icon('link')} Copy bookmark code</button>
      </div>
      <div class="stack" style="gap:10px">
        <h3>Option 2 · Paste anything</h3>
        <p class="muted" style="font-size:.9rem">Paste the bookmark result, a fleet code, an export from Hangar XPLOR or FleetYards, or just a list of ship names, one per line (e.g. <span class="mono">2x Cutlass Black</span>).</p>
        <label for="import-text" class="lbl" style="font:600 .68rem/1 var(--display);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)">Your hangar</label>
        <textarea id="import-text" rows="8" placeholder="Avenger Titan&#10;2x Prospector&#10;Carrack LTI"></textarea>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" id="do-import">Preview import</button>
          <label class="check"><input type="checkbox" id="import-replace"> Replace my current fleet</label>
        </div>
        <div id="import-preview"></div>
      </div>
    </div>`);
  document.getElementById('close-import').addEventListener('click', () => { box.hidden = true; });
  document.getElementById('copy-bm').addEventListener('click', () => copy(BOOKMARKLET_SRC, 'Bookmark code copied'));
  document.getElementById('do-import').addEventListener('click', () => {
    const parsed = parseImport(document.getElementById('import-text').value, ships, findByName);
    const prev = document.getElementById('import-preview');
    if (!parsed.matched.length && !parsed.unmatched.length) { render(prev, html`<p class="muted">Nothing to import. Paste some ship names first.</p>`); return; }
    render(prev, html`
      <p><b>${parsed.matched.length}</b> ship${parsed.matched.length === 1 ? '' : 's'} recognised${parsed.unmatched.length ? html`, <b style="color:var(--warn)">${parsed.unmatched.length}</b> not recognised` : ''}.</p>
      ${parsed.matched.length ? html`<div class="chips" style="margin:8px 0">${parsed.matched.slice(0, 60).map(m => html`<span class="chip">${m.ship.name}${m.insurance ? ` · ${m.insurance}` : ''}</span>`)}</div>` : ''}
      ${parsed.unmatched.length ? html`<details class="more-box"><summary>Not recognised</summary><p class="muted" style="font-size:.88rem">${parsed.unmatched.join(', ')}</p></details>` : ''}
      ${parsed.matched.length ? html`<button class="btn btn-primary" type="button" id="confirm-import" style="margin-top:8px">Add ${parsed.matched.length} ship${parsed.matched.length === 1 ? '' : 's'} to my fleet</button>` : ''}`);
    document.getElementById('confirm-import')?.addEventListener('click', () => {
      const replace = document.getElementById('import-replace').checked;
      const base = replace ? [] : getFleet();
      const added = parsed.matched.map(m => ({ uid: Math.random().toString(36).slice(2, 10), shipId: m.ship.id, source: 'import', name: m.name && norm(m.name) !== norm(m.ship.name) ? m.name : undefined, insurance: m.insurance || undefined, pledge: m.pledge || undefined }));
      saveFleet([...base, ...added]);
      toast(`Imported ${added.length} ships`);
      redraw();
    });
  });
}

// Fuzzy ship-name matcher: exact name, maker-stripped name, then best containment.
function makeMatcher(ships) {
  const strip = s => norm(s).replace(/\b(lti|warbond|edition|best in show|bis|\d{4})\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const index = ships.map(s => ({ s, keys: [strip(s.name), strip(s.fullName), strip(`${s.maker} ${s.name}`), strip(s.name.replace(new RegExp(`^${(s.maker || '').split(' ')[0]}\\s+`, 'i'), ''))] }));
  const exact = new Map();
  for (const { s, keys } of index) for (const k of keys) if (k && !exact.has(k)) exact.set(k, s);
  return name => {
    const k = strip(name);
    if (!k) return null;
    if (exact.has(k)) return exact.get(k);
    let best = null, bestLen = 0;
    for (const { s, keys } of index) for (const key of keys) {
      if (key.length > 2 && (k.includes(key) || key.includes(k)) && key.length > bestLen) { best = s; bestLen = key.length; }
    }
    return best;
  };
}

export function parseImport(text, ships, findByName) {
  const matched = [], unmatched = [];
  const push = (name, extra = {}, count = 1) => {
    const s = findByName(name);
    if (!s) { unmatched.push(name); return; }
    for (let i = 0; i < count; i++) matched.push({ ship: s, name, ...extra });
  };
  const t = (text || '').trim();
  if (!t) return { matched, unmatched };
  if (t.startsWith('VA1:')) {
    try {
      const arr = JSON.parse(decodeURIComponent(escape(atob(t.slice(4)))));
      const byId = new Map(ships.map(s => [s.id, s]));
      for (const [id, name, insurance] of arr) { const s = byId.get(id); if (s) matched.push({ ship: s, name: name || s.name, insurance }); else unmatched.push(id); }
      return { matched, unmatched };
    } catch { /* fall through */ }
  }
  let data = null;
  try { data = JSON.parse(t); } catch { /* not JSON */ }
  if (data) {
    const arr = Array.isArray(data) ? data : data.ships || data.vehicles || data.items || data.data || [];
    for (const o of arr) {
      if (typeof o === 'string') { push(o); continue; }
      const name = o.name || o.ship_name || o.shipName || o.model?.name || o.model || o.title || o.ship || o.slug;
      if (!name || typeof name !== 'string') continue;
      const lti = o.lti === true || o.isLTI || /lti|lifetime/i.test(o.insurance || '');
      push(name, { insurance: lti ? 'LTI' : o.insurance || undefined, pledge: o.pledge || o.pledge_name || undefined }, Math.max(1, Math.min(50, +o.quantity || +o.count || 1)));
    }
    return { matched, unmatched };
  }
  for (let line of t.split(/\r?\n|,/)) {
    line = line.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\s*x\s+(.+)$/i) || line.match(/^(.+?)\s+x\s*(\d+)$/i);
    let count = 1, name = line;
    if (m) { if (/^\d+$/.test(m[1])) { count = +m[1]; name = m[2]; } else { name = m[1]; count = +m[2]; } }
    const lti = /\bLTI\b/i.test(name);
    push(name.replace(/\bLTI\b/i, '').trim(), { insurance: lti ? 'LTI' : undefined }, Math.min(50, count));
  }
  return { matched, unmatched };
}

// ---------------------------------------------------------------- summary & analysis
function summary(list) {
  const s = list.map(x => x.ship);
  const pledge = s.reduce((n, x) => n + (x.msrp || 0), 0);
  const ingame = s.reduce((n, x) => n + (x.buy?.[0]?.price || 0), 0);
  const cargo = s.reduce((n, x) => n + (x.cargo || 0), 0);
  const crew = s.reduce((n, x) => n + (x.crewMax || 1), 0);
  const dps = s.reduce((n, x) => n + (x.dps || 0), 0);
  return html`
    <div class="stat hi"><span>Ships</span><b>${fmt(s.length)}</b></div>
    <div class="stat"><span>Pledge value</span><b>${usd(pledge)}</b></div>
    <div class="stat"><span>In-game value</span><b>${ingame ? `${fmt(ingame / 1e6, 1)}M aUEC` : '—'}</b></div>
    <div class="stat"><span>Total cargo</span><b>${fmt(cargo)} SCU</b></div>
    <div class="stat"><span>Crew seats</span><b>${fmt(crew)}</b></div>
    <div class="stat"><span>Pilot firepower</span><b>${fmt(dps)} DPS</b></div>`;
}

function statsView(host, allShips) {
  const s = resolved.map(x => x.ship);
  const careers = new Map();
  for (const x of s) careers.set(careerOf(x), (careers.get(careerOf(x)) || 0) + 1);
  const entries = [...careers.entries()].sort((a, b) => b[1] - a[1]);
  const sizes = ['Snub', 'Small', 'Medium', 'Large', 'Capital', 'Vehicle'].map(z => [z, s.filter(x => (x.ground ? 'Vehicle' : x.size) === z).length]).filter(([, n]) => n);
  const maxSize = Math.max(1, ...sizes.map(([, n]) => n));
  const text = x => `${x.career} ${x.role} ${(x.foci || []).join(' ')} ${(x.roles || []).join(' ')}`;
  const covered = ROLES.map(([role, re]) => [role, re ? s.filter(x => re.test(text(x))) : s.filter(x => x.ground)]);
  const suggest = role => {
    const [, re] = ROLES.find(r => r[0] === role);
    return allShips.filter(x => (re ? re.test(text(x)) : x.ground) && x.buy?.length).sort((a, b) => a.buy[0].price - b.buy[0].price).slice(0, 2);
  };
  const total = s.length || 1;
  let acc = 0;
  const arcs = entries.map(([c, n]) => {
    const start = acc / total, end = (acc + n) / total; acc += n;
    return { c, n, start, end, color: cssVar(CAREER_COLOR[c] || '--muted') };
  });
  const arcPath = (a0, a1) => {
    const R = 70, r = 44, cx = 80, cy = 80;
    const p = (a, rad) => [cx + rad * Math.sin(a * 2 * Math.PI), cy - rad * Math.cos(a * 2 * Math.PI)];
    const large = a1 - a0 > 0.5 ? 1 : 0;
    if (a1 - a0 >= 0.9999) a1 = a0 + 0.9999;
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    return `M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${large} 0 ${x3} ${y3}Z`;
  };
  render(host, html`
    <div class="grid g2">
      <div class="panel">
        <h2>Fleet by career</h2>
        <div class="donut-wrap">
          <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Fleet by career">
            ${arcs.map(a => html`<path d="${arcPath(a.start, a.end)}" fill="${a.color}" stroke="var(--panel)" stroke-width="2"><title>${a.c}: ${a.n}</title></path>`)}
            <text x="80" y="78" text-anchor="middle" fill="var(--fg)" style="font:600 26px var(--mono)">${s.length}</text>
            <text x="80" y="98" text-anchor="middle" fill="var(--muted)" style="font:500 10px var(--body);letter-spacing:.1em">SHIPS</text>
          </svg>
          <div class="legend">${arcs.map(a => html`<div><span style="background:${a.color}"></span>${a.c} <b class="mono">${a.n}</b></div>`)}</div>
        </div>
      </div>
      <div class="panel">
        <h2>Fleet by size</h2>
        <div class="bars">${sizes.map(([z, n]) => html`<div class="bar"><span class="k">${z}</span><span class="track"><span class="fill" style="display:block;width:${(n / maxSize) * 100}%"></span></span><span class="v">${n}</span></div>`)}</div>
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <h2>What your fleet can do</h2>
      <p class="muted" style="margin-bottom:12px">Gaps are where you'll need a friend, a rental, or your next purchase.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Role</th><th>Your ships</th><th>Cheapest in-game option if missing</th></tr></thead>
        <tbody>${covered.map(([role, list]) => html`<tr>
          <td><b>${role}</b></td>
          <td>${list.length ? html`<span class="chip chip-live">${list.length}</span> <span style="font-size:.88rem">${[...new Set(list.map(x => x.name))].slice(0, 4).join(', ')}</span>` : html`<span class="chip chip-warn">Missing</span>`}</td>
          <td style="font-size:.88rem">${list.length ? html`<span class="muted">Covered</span>` : suggest(role).map((x, i) => html`${i ? ', ' : ''}<a href="#/ships/${x.id}">${x.name}</a> <span class="muted mono">${fmt(x.buy[0].price / 1000)}k</span>`)}</td>
        </tr>`)}</tbody>
      </table></div>
    </div>`);
}

// ---------------------------------------------------------------- 3D hangar (whole fleet)
const MAX_3D = 24;
function hangar3d(host) {
  const withModel = resolved.filter(x => x.ship.holo);
  const list = withModel.slice().sort((a, b) => (b.ship.length || 0) - (a.ship.length || 0)).slice(0, MAX_3D);
  const skipped = resolved.length - list.length;
  render(host, html`
    <div class="viewer3d hangar3d" id="h3d">
      <div class="v3d-status" id="h3d-status">
        <div style="display:grid;gap:10px;justify-items:center;text-align:center;max-width:420px;pointer-events:auto">
          <b style="font-family:var(--display);font-size:1.2rem;color:var(--fg)">Your fleet in 3D</b>
          <span>${list.length} ship models, about ${Math.round(list.length * 6)} MB to download. Big fleets take a moment.</span>
          <button class="btn btn-primary" type="button" id="h3d-go">${icon('play')} Load 3D hangar</button>
        </div>
      </div>
      <div class="lineup-tools" style="left:10px;right:auto"><div class="seg" id="h3d-mode"><button type="button" data-m="paint" class="on">Painted</button><button type="button" data-m="holo">Hologram</button></div></div>
      <div class="lineup-tools"><button class="btn btn-sm" type="button" id="h3d-reset">Reset view</button><button class="btn btn-sm" type="button" id="h3d-full">Full screen</button></div>
    </div>
    <p class="muted" style="font-size:.85rem;margin-top:8px">Drag to orbit, scroll to zoom, right-drag to pan, click a name to fly to that ship. 3D models from <a href="https://fleetyards.net" target="_blank" rel="noopener noreferrer">FleetYards</a> (RSI Holoviewer meshes, shown in each ship's hull colour).${skipped > 0 ? ` ${skipped} ship${skipped > 1 ? 's' : ''} without a model ${skipped > 1 ? 'are' : 'is'} left out${withModel.length > MAX_3D ? `, and only the ${MAX_3D} largest are loaded` : ''}.` : ''}</p>`);
  let viewer = null;
  const host3 = document.getElementById('h3d');
  document.getElementById('h3d-go').addEventListener('click', async () => {
    const status = document.getElementById('h3d-status');
    status.textContent = 'Loading the 3D engine…';
    const { mountFleet } = await import('../viewer3d.js');
    if (!host3.isConnected) return;
    const accent = cssVar('--accent');
    viewer = mountFleet(host3, list.map(({ entry, ship: s }) => ({
      id: s.id, name: entry.name || s.name, url: s.holo, length: s.length || 20, beam: s.beam || (s.length || 20) * 0.6, color: paintFor(s),
    })), {
      accent,
      onProgress: (i, n) => { status.textContent = i >= n ? '' : `Loading ship ${Math.min(n, Math.floor(i) + 1)} of ${n}…`; status.hidden = i >= n; },
      onPick: it => toast(it.name),
    });
  });
  document.getElementById('h3d-mode').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    document.querySelectorAll('#h3d-mode button').forEach(x => x.classList.toggle('on', x === b));
    viewer?.setMode(b.dataset.m);
  });
  document.getElementById('h3d-reset').addEventListener('click', () => viewer?.reset());
  document.getElementById('h3d-full').addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen?.() : host3.requestFullscreen?.().catch(() => toast('Full screen is not available here', 'warn')); });
}

// ---------------------------------------------------------------- lineup (to-scale canvas)
// Ships are drawn from their real top-down renders (FleetYards fleetchart images, nose
// pointing left in the source), rotated nose-up and scaled to true length and beam.
const sprites = new Map(); // url -> { img, ok, tint: Map(color -> canvas) }
function sprite(url, onload) {
  if (!url) return null;
  let sp = sprites.get(url);
  if (!sp) {
    sp = { img: new Image(), ok: false, tint: new Map(), waiters: [] };
    sp.img.crossOrigin = 'anonymous';
    sp.img.decoding = 'async';
    sp.img.onload = () => { sp.ok = true; sp.waiters.splice(0).forEach(f => f()); };
    sp.img.onerror = () => { sp.failed = true; };
    sp.img.src = url;
    sprites.set(url, sp);
  }
  if (!sp.ok && onload && !sp.waiters.includes(onload)) sp.waiters.push(onload);
  return sp;
}
function tinted(sp, color) {
  if (sp.tint.has(color)) return sp.tint.get(color);
  const c = document.createElement('canvas');
  c.width = sp.img.naturalWidth; c.height = sp.img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(sp.img, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.globalAlpha = 0.62; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  sp.tint.set(color, c);
  return c;
}

// Cut-outs of the wiki's in-game top views are made one at a time in idle moments so a
// big fleet never freezes the page.
const cutQueue = [];
let cutBusy = false;
function queueCut(sp, done) {
  if (sp.cut !== undefined || sp.queued) return;
  sp.queued = true;
  cutQueue.push(() => { sp.cut = cutout(sp.img) || null; done(); });
  if (!cutBusy) runCuts();
}
function runCuts() {
  cutBusy = !!cutQueue.length;
  if (!cutBusy) return;
  const next = cutQueue.shift();
  (window.requestIdleCallback || (f => setTimeout(f, 16)))(() => { next(); runCuts(); });
}

function lineupView(host) {
  const mode = store.get('lineupMode', 'real');
  const order = store.get('lineupOrder', 'size');
  render(host, html`
    <div class="lineup" id="lineup">
      <canvas id="lineup-canvas" aria-label="Your ships drawn to scale from their real top-down outlines. Drag to pan, scroll or pinch to zoom, click a ship to open it." role="img"></canvas>
      <div class="lineup-hud"><span id="lineup-scale"></span><span>Drag to pan · scroll or pinch to zoom · click a ship</span></div>
      <div class="lineup-tools" style="left:10px;right:auto">
        <div class="seg" id="lmode"><button type="button" data-m="real" class="${mode === 'real' ? 'on' : ''}">Textured</button><button type="button" data-m="holo" class="${mode === 'holo' ? 'on' : ''}">Hologram</button></div>
        <div class="seg" id="lorder"><button type="button" data-o="size" class="${order === 'size' ? 'on' : ''}">By size</button><button type="button" data-o="role" class="${order === 'role' ? 'on' : ''}">By role</button></div>
      </div>
      <div class="lineup-tools">
        <button class="icon-btn" type="button" id="z-in" aria-label="Zoom in">${icon('plus')}</button>
        <button class="icon-btn" type="button" id="z-out" aria-label="Zoom out">−</button>
        <button class="btn btn-sm" type="button" id="z-fit">Fit</button>
        <button class="btn btn-sm" type="button" id="z-full">Full screen</button>
      </div>
    </div>
    <div class="legend" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px">
      ${[...new Set(resolved.map(x => careerOf(x.ship)))].map(c => html`<div><span style="background:${cssVar(CAREER_COLOR[c] || '--muted')}"></span>${c}</div>`)}
      <div class="muted">True-to-scale top views from in-game screenshots (Star Citizen Wiki) and renders (FleetYards). Zoom in close for full resolution. Renders: <a href="https://fleetyards.net" target="_blank" rel="noopener noreferrer">FleetYards</a>.</div>
    </div>`);
  const canvas = document.getElementById('lineup-canvas');
  const wrap = document.getElementById('lineup');
  let hasRelay = false;
  fetch('/api/health').then(r => { hasRelay = r.ok; if (hasRelay) redraw(); }).catch(() => {});
  const ctx = canvas.getContext('2d');

  // World boxes: width = beam, height = length (nose up). Use the render's own extents when known.
  const items = resolved.map(x => {
    const s = x.ship;
    const L = s.top && s.fcLen ? s.fcLen : s.length || 10;
    const B = s.top && s.fcBeam ? s.fcBeam : s.beam || L * 0.6;
    return { ...x, L, B };
  });
  if (order === 'role') items.sort((a, b) => careerOf(a.ship).localeCompare(careerOf(b.ship)) || b.L - a.L);
  else items.sort((a, b) => b.L - a.L);
  const area = items.reduce((n, i) => n + i.L * i.B, 0) || 1;
  const rowW = Math.max(items.reduce((m, i) => Math.max(m, i.B), 30), Math.sqrt(area) * 2.4);
  let x = 0, y = 0, rowH = 0, lastRole = null;
  for (const it of items) {
    const gap = Math.max(5, it.B * 0.18);
    const role = careerOf(it.ship);
    const newRow = (x > 0 && x + it.B > rowW) || (order === 'role' && lastRole !== null && role !== lastRole);
    if (newRow) { x = 0; y += rowH + Math.max(14, rowH * 0.22); rowH = 0; }
    it.x = x; it.y = y; lastRole = role;
    x += it.B + gap; rowH = Math.max(rowH, it.L);
  }
  const worldW = Math.max(rowW, ...items.map(i => i.x + i.B)), worldH = y + rowH;
  const view = { s: 1, ox: 0, oy: 0 };
  let hover = null, raf = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawCanvas); };

  function size() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  }
  function fit() {
    const r = canvas.getBoundingClientRect();
    const pad = 46;
    view.s = Math.min((r.width - pad * 2) / (worldW || 1), (r.height - pad * 2 - 30) / (worldH || 1));
    view.s = Math.max(0.01, Math.min(view.s, 40));
    view.ox = (r.width - worldW * view.s) / 2;
    view.oy = (r.height - worldH * view.s) / 2 + 6;
    redraw();
  }
  function hull(it) {
    const s = it.ship, c = careerOf(s);
    if (s.ground) return [[-.5, .05], [.5, .05], [.5, .95], [-.5, .95]];
    if (c === 'Combat') return [[0, 0], [.12, .18], [.16, .42], [.5, .78], [.5, .9], [.2, .86], [.18, 1], [-.18, 1], [-.2, .86], [-.5, .9], [-.5, .78], [-.16, .42], [-.12, .18]];
    return [[0, 0], [.18, .12], [.22, .35], [.5, .55], [.5, .68], [.3, .78], [.28, 1], [-.28, 1], [-.3, .78], [-.5, .68], [-.5, .55], [-.22, .35], [-.18, .12]];
  }
  function drawShip(it, px, py, w, h, col) {
    const s = it.ship;
    // Level of detail: swap to the full-resolution render when the ship is big on screen.
    // Textured mode: in-game top view (cut out of its starfield) first, then the
    // painted render, then the plain render in the maker's colours.
    if (mode === 'real' && s.views?.above && !s.views.above.bg && hasRelay) {
      const big = h * dpr > 700;
      const sp = sprite(relayed(wikiWidth(s.views.above.url, big ? 1600 : 800)), redraw);
      const spLo = big ? sprite(relayed(wikiWidth(s.views.above.url, 800)), redraw) : sp;
      for (const x of [sp, spLo]) if (x?.ok) queueCut(x, redraw);
      const cut = sp?.cut || spLo?.cut;
      if (cut) {
        ctx.save();
        ctx.translate(px + w / 2, py + h / 2);
        ctx.rotate(Math.PI / 2);
        ctx.globalAlpha = hover && hover !== it ? 0.7 : 1;
        const bw = h * (cut.canvas.height / cut.canvas.width);
        ctx.drawImage(cut.canvas, -h / 2, -bw / 2, h, bw);
        ctx.restore();
        if (hover === it) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.strokeRect(px - 3, py - 3, w + 6, h + 6); ctx.setLineDash([]); }
        return;
      }
    }
    const loUrl = mode === 'real' && s.topC ? s.topC : s.top;
    const hiUrl = mode === 'real' && s.topC ? s.topCHi : s.topHi;
    const wantHi = hiUrl && h * dpr > 1100;
    const hi = wantHi ? sprite(hiUrl, redraw) : null;
    const lo = sprite(loUrl, redraw);
    const sp = hi?.ok ? hi : lo?.ok ? lo : null;
    if (sp) {
      const src = mode === 'holo' ? tinted(sp, col) : s.topC ? sp.img : recolour(sp.img, paintFor(s));
      ctx.save();
      ctx.translate(px + w / 2, py + h / 2);
      ctx.rotate(Math.PI / 2); // source renders point nose-left; rotate to nose-up
      if (mode === 'holo' && items.length <= 40) { ctx.shadowColor = col; ctx.shadowBlur = hover === it ? 22 : 10; }
      ctx.globalAlpha = hover && hover !== it ? 0.7 : 1;
      // Keep the render's own proportions: length runs along the box, width follows the image.
      const iw = sp.img.naturalWidth, ih = sp.img.naturalHeight;
      const bw = iw && ih ? h * (ih / iw) : w;
      ctx.drawImage(src, -h / 2, -bw / 2, h, bw);
      ctx.restore();
      if (hover === it) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.strokeRect(px - 3, py - 3, w + 6, h + 6); ctx.setLineDash([]); }
      return;
    }
    // Fallback silhouette while loading or when no render exists.
    ctx.beginPath();
    hull(it).forEach(([u, v], i) => { const X = px + (u + .5) * w, Y = py + v * h; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.fillStyle = col; ctx.globalAlpha = hover === it ? 0.5 : 0.25; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  }
  function drawCanvas() {
    if (!canvas.isConnected) return;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const line = cssVar('--line'), fg = cssVar('--fg'), mut = cssVar('--muted');
    // Deck grid: 10 m squares, 100 m when zoomed out.
    const step = view.s * 10 < 9 ? 100 : 10;
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (const [st, a] of [[step, 0.35], [step * 5, 0.7]]) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      const gx0 = Math.floor(-view.ox / view.s / st) * st, gy0 = Math.floor(-view.oy / view.s / st) * st;
      for (let gx = gx0; gx * view.s + view.ox < W; gx += st) { const px = Math.round(gx * view.s + view.ox) + .5; ctx.moveTo(px, 0); ctx.lineTo(px, H); }
      for (let gy = gy0; gy * view.s + view.oy < H; gy += st) { const py = Math.round(gy * view.s + view.oy) + .5; ctx.moveTo(0, py); ctx.lineTo(W, py); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const it of items) {
      const col = cssVar(CAREER_COLOR[careerOf(it.ship)] || '--muted');
      const px = it.x * view.s + view.ox, py = it.y * view.s + view.oy, w = it.B * view.s, h = it.L * view.s;
      if (px > W || py > H || px + w < 0 || py + h + 40 < 0) continue;
      drawShip(it, px, py, w, h, col);
      if (w > 46 || h > 90) {
        ctx.fillStyle = fg; ctx.font = `600 ${Math.min(15, Math.max(10, w / 8))}px "Chakra Petch", sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(it.entry.name || it.ship.name, px + w / 2, py + h + 15, Math.max(w + 20, 70));
        ctx.fillStyle = mut; ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.fillText(`${fmt(it.ship.length || it.L, 1)} m`, px + w / 2, py + h + 28);
      }
    }
    // A 1.8 m person beside the first ship for scale.
    if (items.length) {
      const f = items[0];
      const hh = 1.8 * view.s;
      if (hh > 1.2) {
        const hx = (f.x - 2.5) * view.s + view.ox, hy = (f.y + f.L) * view.s + view.oy;
        ctx.fillStyle = cssVar('--accent');
        ctx.fillRect(hx - Math.max(1, hh * .13), hy - hh * .86, Math.max(2, hh * .26), hh * .86);
        ctx.beginPath(); ctx.arc(hx, hy - hh * .93, Math.max(1, hh * .1), 0, Math.PI * 2); ctx.fill();
        if (hh > 14) { ctx.fillStyle = mut; ctx.font = '500 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.fillText('you, 1.8 m', hx - hh * .3, hy); }
      }
    }
    if (hover) {
      const s = hover.ship;
      const lines = [s.name, s.maker || '', `${fmt(s.length || hover.L, 1)} × ${fmt(s.beam || hover.B, 1)} m · ${s.cargo ? fmt(s.cargo) + ' SCU' : 'no cargo'} · crew ${s.crewMax || 1}`, s.buy?.length ? `${fmt(s.buy[0].price)} aUEC in game` : s.msrp ? `$${fmt(s.msrp)} pledge` : ''].filter(Boolean);
      const bx = Math.min(W - 262, Math.max(8, (hover.x + hover.B) * view.s + view.ox + 12)), by = Math.min(H - 100, Math.max(40, hover.y * view.s + view.oy));
      ctx.fillStyle = cssVar('--panel'); ctx.strokeStyle = cssVar('--accent'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, 250, 18 + lines.length * 18, 6) : ctx.rect(bx, by, 250, 18 + lines.length * 18); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      lines.forEach((l, i) => { ctx.fillStyle = i ? mut : fg; ctx.font = i ? '500 12px "Barlow", sans-serif' : '600 14px "Chakra Petch", sans-serif'; ctx.fillText(l, bx + 10, by + 20 + i * 18, 230); });
    }
    const sc = document.getElementById('lineup-scale');
    if (sc) sc.textContent = `Grid ${step} m · ${items.length} ships · ${Math.round(view.s * 100) / 100} px/m`;
  }
  const hit = (mx, my) => {
    const wx = (mx - view.ox) / view.s, wy = (my - view.oy) / view.s;
    return items.find(it => wx >= it.x && wx <= it.x + it.B && wy >= it.y && wy <= it.y + it.L) || null;
  };
  const zoomAt = (mx, my, f) => {
    const ns = Math.max(0.01, Math.min(80, view.s * f));
    view.ox = mx - (mx - view.ox) * (ns / view.s); view.oy = my - (my - view.oy) * (ns / view.s); view.s = ns; redraw();
  };
  const pointers = new Map();
  let drag = null, moved = false, pinch = null;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    moved = false;
    if (pointers.size === 1) drag = { x: e.offsetX, y: e.offsetY, ox: view.ox, oy: view.oy };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s }; drag = null; }
  });
  canvas.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) / view.s);
      moved = true; return;
    }
    if (drag) {
      const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      view.ox = drag.ox + dx; view.oy = drag.oy + dy; redraw(); return;
    }
    const h = hit(e.offsetX, e.offsetY);
    if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; redraw(); }
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && !moved && e.type === 'pointerup') { const h = hit(e.offsetX, e.offsetY); if (h) location.hash = `#/ships/${h.ship.id}`; }
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; redraw(); } });
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  canvas.addEventListener('dblclick', e => zoomAt(e.offsetX, e.offsetY, 2));
  document.getElementById('z-in').addEventListener('click', () => { const r = canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.4); });
  document.getElementById('z-out').addEventListener('click', () => { const r = canvas.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1 / 1.4); });
  document.getElementById('z-fit').addEventListener('click', fit);
  document.getElementById('z-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrap.requestFullscreen?.().catch(() => toast('Full screen is not available here', 'warn'));
  });
  document.getElementById('lmode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { store.set('lineupMode', b.dataset.m); lineupView(host); } });
  document.getElementById('lorder').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { store.set('lineupOrder', b.dataset.o); lineupView(host); } });
  const ro = new ResizeObserver(() => { if (!canvas.isConnected) { ro.disconnect(); return; } size(); fit(); });
  ro.observe(canvas);
  size(); fit();
}
