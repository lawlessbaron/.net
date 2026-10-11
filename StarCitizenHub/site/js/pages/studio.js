import { html, render, icon, load, lookups, store, fmt, norm, toast, copy } from '../lib.js';
import { session } from '../account.js';
import { drawCard, recordCard, loadImage, FORMATS, PALETTE, shortNum } from '../studio/render.js';
import { events } from '../content/events.js';
import { REFERRAL } from '../content/site.js';
import { recolour, paintFor, cutout, wikiWidth } from '../shipart.js';

const ACCENTS = [['Amber', '#f0a33a'], ['Teal', '#63c7bf'], ['Crimson', '#ec6a58'], ['Violet', '#b48ae8'], ['Sky', '#6aa8e8'], ['Lime', '#9bd45a']];
const PERSONAL = [['fleet', 'My fleet'], ['ship', 'Ship spotlight'], ['rep', 'My reputation']];
const MARKETING = [['shipday', 'Ship of the day'], ['event', 'Next event'], ['contracts', 'Top paying contracts'], ['repgrind', 'Fastest rep climbs'], ['sale', 'Sale & warbond alert'], ['numbers', 'The \'verse in numbers']];
const careerOf = s => (s.ground ? 'Ground' : s.career || 'Multi-Role');
const siteHost = () => (location.host && !/^localhost|^127\./.test(location.host) ? location.host : 'Star Citizen field guide');
const TAGS = '#StarCitizen #SCGame #RobertsSpaceIndustries';

async function fontsReady() {
  try { await Promise.all(['700 40px "Chakra Petch"', '600 40px "Chakra Petch"', '500 30px "Barlow"', '500 30px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch { /* fallback fonts are fine */ }
}

// ---------------------------------------------------------------- data builders
const seededPick = (list, seed) => list[Math.abs([...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % list.length];

async function buildFleet(L, opts) {
  const fleet = store.get('fleet', []);
  const entries = fleet.length ? fleet : ['Avenger Titan', 'Cutlass Black', 'Prospector', 'Vulture', 'Carrack', 'C2 Hercules Starlifter', 'Freelancer MAX', 'Ursa'].map(n => ({ shipId: L.ships.find(s => s.name === n || s.name.endsWith(' ' + n))?.id })).filter(e => e.shipId);
  const ships = entries.map(e => L.shipById.get(e.shipId)).filter(Boolean);
  // Textured: in-game top view cut out of its starfield, else painted render, else plain render.
  const imgs = await Promise.all(ships.map(async s => {
    if (opts.style === 'real' && s.views?.above && !s.views.above.bg) {
      const im = await loadImage(wikiWidth(s.views.above.url, 1000));
      const cut = im && cutout(im);
      if (cut) return { cut: cut.canvas };
    }
    return loadImage(opts.style === 'real' && s.topC ? s.topC : s.top);
  }));
  const acc = (session.user?.rsiHandle && { handle: session.user.rsiHandle, ...(session.user.rsiCard || {}) }) || store.get('account', null);
  const avatar = acc?.avatar ? await loadImage(acc.avatar) : null;
  const name = acc?.handle ? `@${acc.handle}` : 'My fleet';
  const data = {
    eyebrow: fleet.length ? 'Fleet manifest' : 'Example fleet',
    title: acc?.moniker || name, avatar, style: opts.style,
    ships: ships.map((s, i) => ({ name: s.name, L: s.top && s.fcLen ? s.fcLen : s.length || 10, B: s.top && s.fcBeam ? s.fcBeam : s.beam || 6, career: careerOf(s),
      img: imgs[i]?.cut || (opts.style === 'real' && !s.topC && imgs[i] ? recolour(imgs[i], paintFor(s)) : imgs[i]) })),
    stats: [
      { label: 'Ships', value: ships.length },
      { label: 'Cargo', value: ships.reduce((n, s) => n + (s.cargo || 0), 0), format: v => `${fmt(v)} SCU` },
      { label: 'Crew seats', value: ships.reduce((n, s) => n + (s.crewMax || 1), 0) },
      { label: 'Pledge value', value: ships.reduce((n, s) => n + (s.msrp || 0), 0), format: v => `$${fmt(v)}` },
    ],
  };
  const caption = `${acc?.handle ? `@${acc.handle}'s` : 'My'} Star Citizen fleet: ${ships.length} ships, ${fmt(data.stats[1].value)} SCU of cargo and room for ${fmt(data.stats[2].value)} crew. Build yours at ${siteHost()}\n\nNew to Star Citizen? Use referral code ${REFERRAL.code} for ${REFERRAL.bonus} free.\n${TAGS}`;
  return { scene: 'fleet', data, caption, file: `fleet-${acc?.handle || 'mine'}` };
}

async function buildShip(L, shipId, eyebrow) {
  const s = L.shipById.get(shipId) || L.ships.find(x => x.side);
  const photo = s.views?.isometric ? await loadImage(wikiWidth(s.views.isometric.url, 1600)) : null;
  let [side, top] = await Promise.all([loadImage(s.angleC || s.sideC || s.side), s.side || s.sideC ? null : loadImage(s.topC || s.top)]);
  if (side && !s.angleC && !s.sideC) side = recolour(side, paintFor(s));
  if (top && !s.topC) top = recolour(top, paintFor(s));
  const max = k => Math.max(...L.ships.filter(x => !x.ground).map(x => x[k] || 0));
  const data = {
    ship: s, side, top, photo, eyebrow,
    stats: [['SCM speed', s.scm, max('scm'), ' m/s'], ['Cargo', s.cargo, max('cargo'), ' SCU'], ['Shields', s.shield, max('shield')], ['Pilot DPS', s.dps, max('dps')], ['Hull', s.hp, max('hp')], ['Quantum range', s.qtRange, max('qtRange'), ' Gm']],
    tiles: [
      { label: 'In game', value: s.buy?.[0]?.price ? `${shortNum(s.buy[0].price)} aUEC` : 'Pledge only', size: 34 },
      { label: 'Pledge', value: s.msrp ? `$${fmt(s.msrp)}` : '—', size: 34 },
      { label: 'Crew', value: s.crewMax ? String(s.crewMax) : '—', size: 34 },
      { label: 'Length', value: s.length ? `${fmt(s.length, 1)} m` : '—', size: 34 },
    ],
  };
  const where = s.buy?.length ? `Buy it in game for ${fmt(s.buy[0].price)} aUEC at ${s.buy[0].place}.` : s.msrp ? `Pledge price $${fmt(s.msrp)}.` : '';
  const caption = `${eyebrow ? `${eyebrow}: ` : ''}the ${s.maker ? `${s.maker} ` : ''}${s.name}. ${s.role || s.career || ''}${s.cargo ? `, ${fmt(s.cargo)} SCU cargo` : ''}${s.crewMax ? `, crew of ${s.crewMax}` : ''}. ${where}\n\nFull stats, 3D model and paints at ${siteHost()}\nNew player? Referral code ${REFERRAL.code} gets you ${REFERRAL.bonus}.\n${TAGS} #${s.name.replace(/[^A-Za-z0-9]/g, '')}`;
  return { scene: 'ship', data, caption, file: `ship-${s.id}` };
}

function buildRep(L) {
  const reps = store.get('rep', {});
  const rows = Object.entries(reps).map(([id, rep]) => {
    const f = L.factionById.get(id);
    if (!f?.ladder) return null;
    const st = f.ladder.standings.filter(s => s.min >= 0);
    let cur = st[0];
    for (const s of st) if (rep >= s.min) cur = s;
    const next = st.find(s => s.min > rep);
    return { name: f.name, rank: cur?.name || '—', rep, next: next?.name, nextAt: next?.min, progress: next ? (rep - (cur?.min || 0)) / Math.max(1, next.min - (cur?.min || 0)) : 1 };
  }).filter(Boolean).sort((a, b) => b.rep - a.rep);
  const example = !rows.length;
  const data = {
    eyebrow: example ? 'Example reputation report' : 'Reputation report',
    title: session.user?.rsiHandle ? `@${session.user.rsiHandle}` : 'My standing',
    rows: example ? [
      { name: 'Headhunters', rank: 'Sr. Contractor', rep: 7200, next: 'Veteran Contractor', nextAt: 15000, progress: 0.15 },
      { name: 'Covalex Independent Contractors', rank: 'Contractor', rep: 3100, next: 'Sr. Contractor', nextAt: 5800, progress: 0.25 },
      { name: 'Bounty Hunters Guild', rank: 'Jr. Contractor', rep: 1400, next: 'Contractor', nextAt: 2200, progress: 0.43 },
    ] : rows,
  };
  const caption = `My Star Citizen reputation: ${data.rows.slice(0, 3).map(r => `${r.rank} with ${r.name}`).join(', ')}. Tracking every contract on ${siteHost()}\n${TAGS}`;
  return { scene: 'rep', data, caption, file: 'reputation' };
}

function nextEvent() {
  const now = new Date();
  return events.flatMap(ev => [now.getFullYear(), now.getFullYear() + 1].map(y => {
    const d = ev.dates?.[y];
    return { ev, start: d ? new Date(d.start + 'T00:00:00Z') : new Date(Date.UTC(y, ev.window[0][0] - 1, ev.window[0][1])), typical: !d };
  })).filter(x => x.start > now).sort((a, b) => a.start - b.start)[0];
}
function buildEvent() {
  const n = nextEvent();
  const days = Math.max(0, Math.ceil((n.start - Date.now()) / 86400000));
  const date = n.start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return {
    scene: 'event',
    data: { eyebrow: n.typical ? 'Coming up · usual timing' : 'Coming up in the \'verse', title: n.ev.name, summary: n.ev.summary, days, date: n.typical ? `Usually around ${date}` : date, kinds: n.ev.kind },
    caption: `${n.ev.name} is ${days} days away${n.typical ? ' (based on when it usually runs)' : ''}. ${n.ev.summary}\n\nFull events calendar: ${siteHost()}\nNot playing yet? Code ${REFERRAL.code} = ${REFERRAL.bonus} free.\n${TAGS} #${n.ev.name.replace(/[^A-Za-z]/g, '')}`,
    file: `event-${n.ev.id}`,
  };
}
function buildContracts(missions) {
  const pay = m => Math.max(m.reward?.[0] || 0, m.reward?.[1] || 0);
  const list = missions.filter(m => !m.illegal && pay(m) > 0 && !m.currency).sort((a, b) => pay(b) - pay(a));
  const seen = new Set();
  const top = list.filter(m => { const k = m.title + m.giver; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 7);
  return {
    scene: 'list',
    data: { eyebrow: 'Legal contracts', title: 'Top paying missions this patch', items: top.map(m => ({ title: m.title.replace(/[‹›]/g, ''), sub: `${m.giver || '—'} · ${m.minStanding ? m.minStanding.name : 'No rank needed'}`, value: `${shortNum(pay(m))} aUEC`, value2: m.repGain?.[0]?.amount ? `+${fmt(m.repGain[0].amount)} rep` : '' })) },
    caption: `The highest-paying legal contracts in Star Citizen right now:\n${top.slice(0, 5).map((m, i) => `${i + 1}. ${m.title.replace(/[‹›]/g, '')} (${m.giver}): ${fmt(pay(m))} aUEC`).join('\n')}\n\nEvery mission, rank requirement and rep reward: ${siteHost()}\n${TAGS} #SCMissions`,
    file: 'top-contracts',
  };
}
function buildRepGrind(missions) {
  const list = missions.filter(m => !m.illegal && (m.repGain?.[0]?.amount || 0) > 0 && (!m.minStanding || m.minStanding.rep <= 0)).sort((a, b) => b.repGain[0].amount - a.repGain[0].amount);
  const seen = new Set();
  const top = list.filter(m => { if (seen.has(m.giver)) return false; seen.add(m.giver); return true; }).slice(0, 7);
  return {
    scene: 'list',
    data: { eyebrow: 'No rank needed', title: 'Fastest reputation climbs for new players', items: top.map(m => ({ title: m.giver, sub: m.title.replace(/[‹›]/g, ''), value: `+${fmt(m.repGain[0].amount)} rep`, value2: m.reward?.[0] ? `${shortNum(m.reward[0])} aUEC` : '' })) },
    caption: `New to Star Citizen? These mission givers hand out the most reputation per contract with no rank needed:\n${top.slice(0, 5).map(m => `• ${m.giver}: +${fmt(m.repGain[0].amount)} rep`).join('\n')}\n\nTrack your rank climb at ${siteHost()}\nStarting out? Code ${REFERRAL.code} = ${REFERRAL.bonus}.\n${TAGS} #SCNewPlayer`,
    file: 'rep-climbs',
  };
}
function buildSale(L) {
  const rows = L.ships.flatMap(s => (s.skus || []).filter(k => k.avail && (k.sale || k.warbond)).map(k => ({ s, k })));
  const seenTitles = new Set();
  const items = rows.sort((a, b) => (a.k.sale || a.k.price) - (b.k.sale || b.k.price))
    .filter(({ k }) => { const t = k.title.trim().toLowerCase(); if (seenTitles.has(t)) return false; seenTitles.add(t); return true; }).slice(0, 7);
  const fallback = !items.length;
  const list = fallback ? L.ships.filter(s => s.buy?.length && s.msrp).sort((a, b) => a.buy[0].price - b.buy[0].price).slice(0, 7).map(s => ({ title: s.name, sub: `${s.maker} · ${s.buy[0].place}`, value: `${shortNum(s.buy[0].price)} aUEC`, value2: '' }))
    : items.map(({ s, k }) => ({ title: k.title.trim(), sub: `${s.maker || ''} · ${k.warbond ? 'Warbond' : 'On sale'}`, value: `$${fmt(k.sale || k.price)}`, value2: k.sale ? `was $${fmt(k.price)}` : '' }));
  return {
    scene: 'list',
    data: { eyebrow: fallback ? 'No real money needed' : 'Pledge store right now', title: fallback ? 'Cheapest ships to buy in game' : 'Sales & warbond deals', items: list },
    caption: fallback ? `You don't need to spend real money for a new ship. Cheapest ships you can buy with in-game aUEC:\n${list.slice(0, 5).map(i => `• ${i.title}: ${i.value}`).join('\n')}\n\nAll prices and dealers: ${siteHost()}\n${TAGS}`
      : `Pledge store deals right now:\n${list.slice(0, 5).map(i => `• ${i.title}: ${i.value}${i.value2 ? ` (${i.value2})` : ''}`).join('\n')}\n\nEvery ship price, in game and real money: ${siteHost()}\n${TAGS} #SCSale`,
    file: 'deals',
  };
}
function buildNumbers(meta) {
  const c = meta.counts || {};
  return {
    scene: 'numbers',
    data: { eyebrow: `Star Citizen ${meta.gameVersion || ''}`.trim(), title: 'The \'verse in numbers', stats: [['Missions', c.missions], ['Ships & variants', c.ships], ['Items & gear', c.items], ['Paints', c.paints], ['Places with shops', c.locations], ['Factions', c.factions]].filter(([, v]) => v).map(([label, value]) => ({ label, value })) },
    caption: `Star Citizen ${meta.gameVersion || ''} by the numbers: ${fmt(c.missions)} missions, ${fmt(c.ships)} ships and variants, ${fmt(c.items)} items, ${fmt(c.paints)} paints. All searchable on ${siteHost()}\n${TAGS}`,
    file: 'verse-in-numbers',
  };
}

// ---------------------------------------------------------------- page
export default async function studio(main, ctx) {
  let L, missions;
  try { [L, missions] = await Promise.all([lookups(), load('missions')]); } catch (e) { render(main, html`<div class="empty"><h2>Couldn't load data</h2><p>${e.message}</p></div>`); return; }
  await fontsReady();
  const marketingAllowed = !!session.user?.admin || (session.ready && !session.enabled);
  const shipsWithArt = L.ships.filter(s => s.views || s.side || s.top).sort((a, b) => a.name.localeCompare(b.name));
  const today = new Date().toISOString().slice(0, 10);
  const shipOfDay = date => seededPick(shipsWithArt.filter(s => s.buy?.length && (s.views?.isometric || s.angleC || s.sideC) && !s.ground && s.scm && (s.cargo || s.dps)), date);
  const state = {
    template: ctx.params.t || 'fleet', format: 'square', accent: PALETTE.accent, style: 'real', referral: true,
    shipId: ctx.params.id || shipOfDay(today).id,
  };
  if (!marketingAllowed && MARKETING.some(([k]) => k === state.template)) state.template = 'fleet';

  render(main, html`
    <div class="page-head">
      <span class="eyebrow">Share studio</span>
      <h1>Show off your fleet</h1>
      <p class="lede">Make a picture or a short video of your fleet, your favourite ship or your reputation, sized for Instagram, X, TikTok and Discord. Download it, or post it straight from your phone.</p>
    </div>
    <div class="studio">
      <aside class="stack studio-controls">
        <div class="panel">
          <h3 style="margin-bottom:10px">Template</h3>
          <div class="chips" id="st-tpl">${PERSONAL.map(([k, l]) => html`<button type="button" class="chip-btn ${k === state.template ? 'on' : ''}" data-t="${k}">${l}</button>`)}</div>
          ${marketingAllowed ? html`<h3 style="margin:14px 0 10px">Site marketing</h3>
          <div class="chips" id="st-mkt">${MARKETING.map(([k, l]) => html`<button type="button" class="chip-btn ${k === state.template ? 'on' : ''}" data-t="${k}">${l}</button>`)}</div>` : ''}
        </div>
        <div class="panel stack" style="gap:12px">
          <div class="field" id="st-ship-wrap"><label for="st-ship">Ship</label>
            <input id="st-ship-q" type="search" placeholder="Search ships" style="margin-bottom:6px">
            <select id="st-ship" size="6">${shipsWithArt.map(s => html`<option value="${s.id}" ${s.id === state.shipId ? 'selected' : ''}>${s.name}</option>`)}</select></div>
          <div class="field"><span class="lbl">Size</span><div class="seg" id="st-fmt">${Object.entries(FORMATS).map(([k, f]) => html`<button type="button" data-f="${k}" class="${k === state.format ? 'on' : ''}" title="${f.label}">${k === 'square' ? 'Square' : k === 'landscape' ? 'Landscape' : 'Story'}</button>`)}</div></div>
          <div class="field"><span class="lbl">Accent colour</span><div class="swatches" id="st-acc">${ACCENTS.map(([n, c]) => html`<button type="button" style="background:${c}" data-c="${c}" title="${n}" aria-label="${n}" class="${c === state.accent ? 'on' : ''}"></button>`)}</div></div>
          <div class="field" id="st-style-wrap"><span class="lbl">Ship style</span><div class="seg" id="st-style"><button type="button" data-s="real" class="on">Textured</button><button type="button" data-s="holo">Hologram</button></div></div>
          <label class="check"><input type="checkbox" id="st-ref" checked> Show referral code (${REFERRAL.code})</label>
        </div>
      </aside>
      <section class="stack" style="min-width:0">
        <div class="studio-stage"><canvas id="st-canvas" aria-label="Share image preview"></canvas><div class="studio-busy" id="st-busy" hidden>Loading ship art…</div></div>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" id="st-png">${icon('box')} Download image</button>
          <button class="btn" type="button" id="st-video">${icon('play')} Make video (6 s)</button>
          <button class="btn btn-ghost" type="button" id="st-play">Preview animation</button>
          <button class="btn btn-ghost" type="button" id="st-share" hidden>${icon('link')} Share…</button>
          <span class="muted mono" id="st-status" style="font-size:.85rem"></span>
        </div>
        <div class="panel">
          <div class="panel-title"><h3>Caption</h3><button class="btn btn-sm" type="button" id="st-copy">Copy caption</button></div>
          <textarea id="st-caption" rows="6" style="font-family:var(--body);font-size:.95rem"></textarea>
        </div>
      </section>
    </div>
    ${marketingAllowed ? html`
    <section class="panel" style="margin-top:22px">
      <div class="panel-title"><h2>This week's posts</h2><span class="muted" style="font-size:.88rem">Auto-generated from the latest data. Click one to edit, download or turn into a video.</span></div>
      <div class="cards" id="st-week"><div class="loading">Generating…</div></div>
    </section>` : ''}
  `);

  const $ = id => document.getElementById(id);
  const canvas = $('st-canvas');
  const ctx2 = canvas.getContext('2d');
  let current = null, token = 0;

  async function build(template = state.template, shipId = state.shipId, date = today) {
    switch (template) {
      case 'fleet': return buildFleet(L, state);
      case 'ship': return buildShip(L, shipId);
      case 'rep': return buildRep(L);
      case 'shipday': return buildShip(L, shipOfDay(date).id, 'Ship of the day');
      case 'event': return buildEvent();
      case 'contracts': return buildContracts(missions);
      case 'repgrind': return buildRepGrind(missions);
      case 'sale': return buildSale(L);
      default: return buildNumbers(ctx.meta || {});
    }
  }
  const opts = () => ({ scene: current.scene, data: current.data, format: state.format, accent: state.accent, referral: state.referral, site: siteHost() });
  function size() { const f = FORMATS[state.format]; canvas.width = f.w; canvas.height = f.h; canvas.style.aspectRatio = `${f.w} / ${f.h}`; }

  async function refresh() {
    const my = ++token;
    if (!canvas.isConnected) return;
    $('st-ship-wrap').hidden = state.template !== 'ship';
    $('st-style-wrap').hidden = state.template !== 'fleet';
    $('st-busy').hidden = false;
    const built = await build();
    if (my !== token || !canvas.isConnected) return; // template changed or the page was left
    current = built;
    $('st-busy').hidden = true;
    size();
    drawCard(ctx2, { ...opts(), t: 1 });
    $('st-caption').value = current.caption;
  }

  async function blobOf() { return new Promise(res => canvas.toBlob(res, 'image/png')); }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  $('st-png').addEventListener('click', async () => {
    try { const b = await blobOf(); download(b, `${current.file}-${state.format}.png`); toast('Image saved'); }
    catch { toast('This image includes art the browser won\'t export. Try another ship or run the site with its server.', 'warn'); }
  });
  let recording = false;
  $('st-video').addEventListener('click', async () => {
    if (recording) return;
    recording = true;
    const btn = $('st-video'); btn.disabled = true;
    try {
      const { blob, ext } = await recordCard(canvas, opts(), { seconds: 6, onProgress: p => { $('st-status').textContent = `Recording… ${Math.round(p * 100)}%`; } });
      download(blob, `${current.file}-${state.format}.${ext}`);
      $('st-status').textContent = `Saved ${ext.toUpperCase()} video (${(blob.size / 1e6).toFixed(1)} MB)`;
      if (ext === 'webm') $('st-status').textContent += '. Instagram and TikTok prefer MP4: open it in CapCut or convert it before posting.';
    } catch (e) { toast(e.message, 'warn'); $('st-status').textContent = ''; }
    recording = false; btn.disabled = false;
    drawCard(ctx2, { ...opts(), t: 1 });
  });
  $('st-play').addEventListener('click', () => {
    const start = performance.now();
    const frame = now => { const t = Math.min(1, (now - start) / 4800); drawCard(ctx2, { ...opts(), t }); if (t < 1) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  });
  if (navigator.canShare) {
    $('st-share').hidden = false;
    $('st-share').addEventListener('click', async () => {
      try {
        const file = new File([await blobOf()], `${current.file}.png`, { type: 'image/png' });
        if (!navigator.canShare({ files: [file] })) throw new Error('Sharing files isn\'t supported here');
        await navigator.share({ files: [file], text: $('st-caption').value });
      } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'warn'); }
    });
  }
  $('st-copy').addEventListener('click', () => copy($('st-caption').value, 'Caption copied'));

  const pick = (sel, attr, key, after) => $(sel).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state[key] = b.dataset[attr];
    $(sel).querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    after();
  });
  const tplClick = e => {
    const b = e.target.closest('button'); if (!b) return;
    state.template = b.dataset.t;
    document.querySelectorAll('#st-tpl button, #st-mkt button').forEach(x => x.classList.toggle('on', x === b));
    refresh();
  };
  $('st-tpl').addEventListener('click', tplClick);
  $('st-mkt')?.addEventListener('click', tplClick);
  pick('st-fmt', 'f', 'format', () => { size(); drawCard(ctx2, { ...opts(), t: 1 }); });
  pick('st-acc', 'c', 'accent', () => drawCard(ctx2, { ...opts(), t: 1 }));
  pick('st-style', 's', 'style', refresh);
  $('st-ref').addEventListener('change', e => { state.referral = e.target.checked; drawCard(ctx2, { ...opts(), t: 1 }); });
  $('st-ship').addEventListener('change', e => { state.shipId = e.target.value; refresh(); });
  $('st-ship-q').addEventListener('input', e => {
    const q = norm(e.target.value);
    render($('st-ship'), shipsWithArt.filter(s => !q || norm(`${s.name} ${s.maker}`).includes(q)).map(s => html`<option value="${s.id}" ${s.id === state.shipId ? 'selected' : ''}>${s.name}</option>`));
  });

  await refresh();

  // Marketing: a week of ready-made posts.
  if (marketingAllowed) {
    const plan = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 86400000);
      const date = d.toISOString().slice(0, 10);
      const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const template = ['shipday', 'contracts', 'shipday', 'event', 'repgrind', 'sale', 'numbers'][i];
      plan.push({ day, date, template });
    }
    const week = $('st-week');
    render(week, plan.map((p, i) => html`<button type="button" class="card week-post" data-i="${i}"><div class="card-media"><canvas width="540" height="540" id="wk-${i}"></canvas></div>
      <div class="card-body"><div class="card-sub">${p.day}</div><div class="card-title" style="font-size:.95rem">${MARKETING.find(m => m[0] === p.template)[1]}</div></div></button>`));
    for (const [i, p] of plan.entries()) {
      const b = await build(p.template, null, p.date);
      p.built = b;
      const c = $(`wk-${i}`);
      if (!c || !canvas.isConnected) return;
      const tmp = document.createElement('canvas');
      tmp.width = 1080; tmp.height = 1080;
      drawCard(tmp.getContext('2d'), { scene: b.scene, data: b.data, format: 'square', accent: state.accent, referral: true, site: siteHost(), t: 1 });
      c.getContext('2d').drawImage(tmp, 0, 0, 540, 540);
    }
    week.addEventListener('click', e => {
      const card = e.target.closest('[data-i]'); if (!card) return;
      const p = plan[+card.dataset.i];
      state.template = p.template;
      if (p.built?.data?.ship) state.shipId = p.built.data.ship.id;
      document.querySelectorAll('#st-tpl button, #st-mkt button').forEach(x => x.classList.toggle('on', x.dataset.t === p.template));
      current = p.built; size(); drawCard(ctx2, { ...opts(), t: 1 }); $('st-caption').value = current.caption;
      main.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
