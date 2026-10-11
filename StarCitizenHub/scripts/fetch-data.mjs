#!/usr/bin/env node
// Pulls live Star Citizen data from public community APIs and writes compact
// JSON files into site/data/ for the static site to read.
//
//   node scripts/fetch-data.mjs            # fetch everything (uses a local cache)
//   node scripts/fetch-data.mjs --fresh    # ignore the cache
//   node scripts/fetch-data.mjs --only=news
//
// Sources:
//   Star Citizen Wiki API  https://api.star-citizen.wiki  (missions, factions, ships, items)
//   UEX Corp API 2.0       https://api.uexcorp.space      (shops, terminals, item prices)
//   RSI comm-link RSS + Star Citizen YouTube channel feed (news & videos)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { latestVideos } from '../server/youtube.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'data');
const CACHE = path.join(ROOT, '.cache');
const WIKI = 'https://api.star-citizen.wiki/api/v2';
const UEX = 'https://api.uexcorp.space/2.0';

const args = process.argv.slice(2);
const FRESH = args.includes('--fresh');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = name => ONLY.length === 0 || ONLY.includes(name);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getText(url, { tries = 4, cache = true } = {}) {
  // Long URLs are shortened for the file name; continuation requests add a hash of the
  // full URL so page 2+ of a query never collides with page 1.
  let name = url.replace(/[^a-z0-9]+/gi, '_').slice(0, 200);
  if (/[?&](continue|imcontinue|sroffset)=/.test(url) && url.length > 200) name = name.slice(0, 160) + '_' + createHash('sha1').update(url).digest('hex').slice(0, 16);
  const key = path.join(CACHE, name);
  if (cache && !FRESH && existsSync(key)) return readFile(key, 'utf8');
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'VerseAtlas data builder (fan project; github.com/lawlessbaron)', Accept: 'application/json, application/xml, text/xml, */*' } });
      if (res.status === 429) { await sleep(5000 * (i + 1)); continue; }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      const text = await res.text();
      if (cache) { await mkdir(CACHE, { recursive: true }); await writeFile(key, text); }
      return text;
    } catch (e) {
      lastErr = e;
      await sleep(1000 * 2 ** i);
    }
  }
  throw lastErr;
}
const getJson = async (url, opts) => JSON.parse(await getText(url, opts));

// Runs fn over items with limited concurrency.
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (++done % 100 === 0) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

async function wikiAll(endpoint, size = 50) {
  const first = await getJson(`${WIKI}/${endpoint}${endpoint.includes('?') ? '&' : '?'}page%5Bsize%5D=${size}&page%5Bnumber%5D=1`);
  const last = first.meta?.last_page || 1;
  const pages = [first];
  const rest = await pool(Array.from({ length: last - 1 }, (_, i) => i + 2), 4, n =>
    getJson(`${WIKI}/${endpoint}${endpoint.includes('?') ? '&' : '?'}page%5Bsize%5D=${size}&page%5Bnumber%5D=${n}`));
  pages.push(...rest);
  return pages.flatMap(p => p.data || []);
}

const uex = async endpoint => (await getJson(`${UEX}/${endpoint}`)).data;

const en = v => (v && typeof v === 'object' ? v.en_EN ?? Object.values(v)[0] : v) ?? null;
const num = v => (v === null || v === undefined || v === '' || Number.isNaN(+v) ? null : +v);
const round = (v, d = 0) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const compact = obj => {
  // Drop null / empty values to keep the JSON small.
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete obj[k];
  }
  return obj;
};
const write = async (name, data) => {
  await mkdir(OUT, { recursive: true });
  const file = path.join(OUT, name);
  await writeFile(file, JSON.stringify(data));
  const kb = (JSON.stringify(data).length / 1024).toFixed(0);
  console.log(`✔ wrote data/${name} (${kb} KB)`);
};

// Strips mission-token markup like [Pickup1|Address] into readable placeholders.
function cleanMissionText(s) {
  if (!s) return null;
  return s
    .replace(/<\/?EM\d*>/gi, '')
    .replace(/~mission\(([^)|]+)(\|[^)]+)?\)/gi, (_, a) => `‹${a.replace(/([a-z])([A-Z])/g, '$1 $2')}›`)
    .replace(/\[([A-Za-z0-9_ ]+?)(?:\|[A-Za-z]+)?\]/g, (_, a) => `‹${a.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/(\D)(\d)$/, '$1 $2')}›`)
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Mission-giver names sometimes come through as raw game identifiers.
function cleanGiver(name, faction) {
  if (!name || /^(~mission|<=|SENDER NOT FOUND$|N\/A$)/i.test(name)) return faction || null;
  if (/\s/.test(name)) return name.trim();
  // Identifier-style names, e.g. MissionGiver_RedWindLinehaul, CrusaderBountyDepartment, NorthRock_Bounty.
  if (!/_|BountyDepartment$/.test(name)) return name;
  return name
    .replace(/^MissionGiver_/, '')
    .replace(/_Bounty$/, ' Bounty Office')
    .replace(/BountyDepartment$/, ' Bounty Department')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])(?=[a-z]{2})/g, '$1 $2')
    .replace(/^Micro Tech/, 'microTech')
    .replace(/^Blac Jac/, 'BlacJac')
    .replace(/^North Rock/, 'NorthRock')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- terminals / places
let terminalCache;
async function loadTerminals() {
  if (terminalCache) return terminalCache;
  const [terminals, pois] = await Promise.all([uex('terminals'), uex('poi')]);
  const poiById = new Map(pois.map(p => [p.id, p]));
  const map = new Map();
  for (const t of terminals) {
    if (!t.is_available_live && !t.is_available) continue;
    const poi = t.id_poi ? poiById.get(t.id_poi) : null;
    const placeName = t.space_station_name || t.city_name || t.outpost_name || poi?.name || t.moon_name || t.planet_name || t.orbit_name || t.star_system_name;
    const placeKind = t.space_station_name ? 'Station' : t.city_name ? 'City' : t.outpost_name ? 'Outpost' : poi ? (poi.type || 'Point of interest') : 'Area';
    map.set(t.id, compact({
      id: t.id,
      name: (t.fullname || t.name || '').replace(/^Commodity Shop - /, 'Trade Terminal - '),
      code: t.code,
      type: t.type,
      company: t.company_name,
      system: t.star_system_name,
      planet: t.planet_name,
      moon: t.moon_name,
      orbit: t.orbit_name,
      place: placeName,
      placeKind,
      placeId: slugify(`${t.star_system_name}-${placeName}`),
      faction: t.faction_name,
      food: t.is_food ? 1 : 0,
      fps: t.is_shop_fps ? 1 : 0,
      vehicle: t.is_shop_vehicle ? 1 : 0,
      refuel: t.is_refuel ? 1 : 0,
      repair: t.is_repair ? 1 : 0,
      medical: t.is_medical ? 1 : 0,
      refinery: t.is_refinery ? 1 : 0,
      cargo: t.is_cargo_center ? 1 : 0,
      habitation: t.is_habitation ? 1 : 0,
      maxContainer: num(t.max_container_size),
      screenshot: t.screenshot || null,
    }));
  }
  terminalCache = { map, pois, terminals };
  return terminalCache;
}

// ---------------------------------------------------------------- missions & factions
async function buildMissions() {
  console.log('→ missions (Star Citizen Wiki)');
  const list = await wikiAll('missions', 50);
  console.log(`  ${list.length} missions listed, fetching details…`);
  const details = await pool(list, 6, async m => {
    try { return (await getJson(`${WIKI}/missions/${m.uuid}`)).data; } catch { return m; }
  });

  console.log('→ factions');
  const factionList = await wikiAll('factions', 50);
  const factionDetails = await pool(factionList, 6, async f => {
    try { return (await getJson(`${WIKI}/factions/${f.uuid}`)).data; } catch { return f; }
  });

  const factionByName = new Map(factionDetails.map(f => [f.name, f]));
  const missions = [];
  for (const m of details) {
    if (m.not_for_release || m.released === false) continue;
    // Locations grouped by purpose (Availability, Pickup, Dropoff, …).
    const locations = {};
    const merged = m.merged_locations && typeof m.merged_locations === 'object' && !Array.isArray(m.merged_locations) ? m.merged_locations : {};
    for (const [purpose, list] of Object.entries(merged)) {
      if (!Array.isArray(list) || !list.length) continue;
      const names = [...new Set(list.map(l => (l.system ? `${l.name} · ${l.system.replace(/ System$/, '')}` : l.name)).filter(Boolean))];
      locations[purpose] = names.slice(0, 40);
      if (names.length > 40) locations[purpose].push(`+${names.length - 40} more`);
    }
    const linkedMissions = groups => (groups || []).flatMap(g => (g.missions || []).map(x => ({ id: x.uuid, title: cleanMissionText(x.title) })));
    const enemyShips = [...new Set((m.combat?.spawns || []).flatMap(sp => (sp.ships || []).map(sh => sh.name)).filter(Boolean))].slice(0, 30);
    const enemyNpcs = [...new Set((m.combat?.spawns || []).filter(sp => sp.spawn_kind && sp.spawn_kind !== 'Ship').map(sp => sp.group_name).filter(Boolean))].slice(0, 12);
    const repPre = m.reputation_prerequisite;
    const giverFaction = m.faction?.uuid || null;
    missions.push(compact({
      id: m.uuid,
      title: cleanMissionText(m.title) || 'Untitled contract',
      giver: cleanGiver(m.mission_giver, m.faction?.name),
      factionId: giverFaction,
      faction: m.faction?.name || null,
      type: m.mission_type || null,
      category: m.reward_scope || null,
      illegal: m.illegal ? 1 : 0,
      shareable: m.shareable ? 1 : 0,
      onceOnly: m.once_only ? 1 : 0,
      combat: m.has_combat ? 1 : 0,
      enemies: m.combat?.summary?.total?.max ? [m.combat.summary.total.min ?? 0, m.combat.summary.total.max]
        : m.enemy_count_max ? [m.enemy_count_min ?? 0, m.enemy_count_max] : null,
      enemyShips,
      enemyNpcs,
      reward: num(m.reward_min) || num(m.reward_max) ? [num(m.reward_min) || 0, num(m.reward_max) || 0] : null,
      currency: m.reward_currency && m.reward_currency !== 'UEC' ? m.reward_currency : null,
      systems: m.star_systems || [],
      minStanding: repPre?.min_standing ? { name: repPre.min_standing.name, rep: repPre.min_standing.min_reputation, faction: repPre.faction }
        : m.min_standing && m.min_standing.name !== '<= PLACEHOLDER =>' ? { name: m.min_standing.name, rep: m.min_standing.min_reputation } : null,
      maxStanding: repPre?.max_standing ? { name: repPre.max_standing.name, rep: repPre.max_standing.min_reputation }
        : m.max_standing ? { name: m.max_standing.name, rep: m.max_standing.min_reputation } : null,
      repGain: (m.reputation_gained || []).map(r => compact({ faction: r.faction, factionId: r.faction_uuid, amount: r.amount, scope: r.scope })),
      repLoss: (m.reputation_lost || []).map(r => compact({ faction: r.faction, factionId: r.faction_uuid, amount: r.amount, scope: r.scope })),
      crime: [m.min_crime_stat ?? 0, m.max_crime_stat ?? 5],
      prison: m.available_in_prison ? 1 : 0,
      failIfCriminal: m.fail_if_became_criminal ? 1 : 0,
      cooldown: m.cooldown_label || null,
      lifetime: m.lifetime?.label || null,
      timeLimit: num(m.time_to_complete_minutes) || num(m.deadline?.completion_time_minutes),
      maxPlayers: num(m.max_players_per_instance),
      chain: m.has_chain ? 1 : 0,
      prereq: m.has_prerequisites ? 1 : 0,
      blueprints: (m.blueprints || []).map(pool => compact({ chance: pool.drop_chance_percent ?? null, items: (pool.items || []).map(x => ({ id: x.uuid, name: x.name })) })).filter(p => p.items?.length).slice(0, 10),
      rewardItems: (m.reward_items || []).map(x => compact({ id: x.uuid, name: x.name, amount: x.amount })).filter(x => x.name).slice(0, 20),
      requires: linkedMissions(m.prerequisite_groups).slice(0, 20),
      unlocks: linkedMissions(m.unlock_groups).slice(0, 20),
      rentalShips: (m.rental_ships || []).map(r => r.name).filter(Boolean),
      hauling: (m.hauling_summary || []).map(h => compact({ name: h.name, min: h.min_amount, max: h.max_amount, minScu: h.min_scu, maxScu: h.max_scu })),
      cost: num(m.cost?.amount ?? m.cost),
      locations: Object.keys(locations).length ? locations : null,
      description: cleanMissionText(m.description),
      wiki: m.web_url || null,
      version: m.game_version || m.version || null,
    }));
  }
  missions.sort((a, b) => a.title.localeCompare(b.title));

  // Faction / mission-giver index.
  const missionCount = new Map();
  const giversByFaction = new Map();
  for (const m of missions) {
    if (!m.factionId) continue;
    missionCount.set(m.factionId, (missionCount.get(m.factionId) || 0) + 1);
    if (m.giver) {
      if (!giversByFaction.has(m.factionId)) giversByFaction.set(m.factionId, new Set());
      giversByFaction.get(m.factionId).add(m.giver);
    }
  }
  const factions = factionDetails.map(f => compact({
    id: f.uuid,
    name: f.name,
    type: f.faction_type || null,
    lawful: f.lawful === true ? 1 : f.lawful === false ? 0 : null,
    hasRep: f.has_reputation ? 1 : 0,
    description: f.description || null,
    hq: f.headquarters && f.headquarters !== 'N/A' ? f.headquarters : null,
    area: f.area && f.area !== 'N/A' ? f.area : null,
    focus: f.focus && f.focus !== 'N/A' ? f.focus : null,
    founded: f.founded && f.founded !== 'N/A' ? f.founded : null,
    leadership: f.leadership && f.leadership !== 'N/A' ? f.leadership : null,
    reaction: f.default_reaction || null,
    ladder: f.reputation_ladder ? {
      name: f.reputation_ladder.display_name,
      ceiling: f.reputation_ladder.reputation_ceiling,
      standings: (f.reputation_ladder.standings || [])
        .map(s => ({ name: s.display_name, min: s.min_reputation }))
        .sort((a, b) => a.min - b.min),
    } : null,
    givers: [...(giversByFaction.get(f.uuid) || [])].sort(),
    missions: missionCount.get(f.uuid) || 0,
  })).filter(f => f.missions > 0 || f.hasRep);
  factions.sort((a, b) => (b.missions || 0) - (a.missions || 0) || a.name.localeCompare(b.name));

  void factionByName;
  await write('missions.json', missions);
  await write('factions.json', factions);
  return { missions: missions.length, factions: factions.length };
}

// ---------------------------------------------------------------- ships & vehicles
async function buildShips() {
  console.log('→ ships & vehicles (Star Citizen Wiki)');
  const [vehicles, { map: terminals }] = await Promise.all([wikiAll('vehicles', 50), loadTerminals()]);
  let uexVehicles = [];
  try { uexVehicles = await uex('vehicles'); } catch (e) { console.warn('  UEX vehicles unavailable:', e.message); }
  // FleetYards: top/side "fleetchart" renders (transparent PNG/WebP, CORS-enabled) used for to-scale outlines.
  let fyModels = [];
  try {
    for (let page = 1; page <= 5; page++) {
      const res = await getJson(`https://api.fleetyards.net/v1/models?perPage=240&page=${page}`);
      fyModels.push(...(res.items || []));
      if (page >= (res.meta?.pagination?.totalPages || 1)) break;
    }
    console.log(`  FleetYards models: ${fyModels.length}`);
  } catch (e) { console.warn('  FleetYards unavailable:', e.message); }
  const fyBySlug = new Map(fyModels.map(m => [m.slug, m]));
  const fyByClass = new Map(fyModels.filter(m => m.scIdentifier).map(m => [m.scIdentifier.toLowerCase(), m]));
  const fyUsed = new Set();
  const fyByName = new Map(fyModels.map(m => [slugify(m.name), m]));
  const uexBySlug = new Map(uexVehicles.map(v => [v.slug, v]));
  const uexByName = new Map(uexVehicles.map(v => [slugify(v.name_full || v.name), v]));

  const priceRow = (p, key) => {
    const t = terminals.get(p.terminal_id);
    return compact({
      price: num(p[key]),
      terminal: t?.name || p.terminal_name,
      terminalId: p.terminal_id,
      place: t?.place || p.starmap_location?.name || null,
      placeId: t?.placeId || null,
      system: t?.system || p.starmap_location?.star_system_name || null,
      updated: p.date_updated ? p.date_updated.slice(0, 10) : null,
    });
  };

  const ships = vehicles.map(v => {
    const u = uexBySlug.get(v.slug) || uexByName.get(slugify(v.game_name || v.name)) || null;
    const roles = u ? Object.keys(u).filter(k => k.startsWith('is_') && u[k] === 1 && !['is_spaceship', 'is_ground_vehicle', 'is_concept', 'is_addon', 'is_quantum_capable', 'is_showdown_winner'].includes(k)).map(k => k.slice(3).replace(/_/g, ' ')) : [];
    const img = (v.images || [])[0];
    const fy = fyByClass.get((v.class_name || '').toLowerCase()) || fyBySlug.get(v.slug) || fyByName.get(slugify(v.name)) || null;
    if (fy) fyUsed.add(fy.slug);
    return compact({
      id: v.slug || slugify(v.name),
      name: v.name,
      fullName: v.game_name || v.name,
      maker: v.manufacturer?.name || null,
      makerCode: v.manufacturer?.code || null,
      chassis: v.chassis_id ?? null,
      career: v.career || en(v.type) || null,
      role: v.role || null,
      foci: (v.foci || []).map(en).filter(Boolean),
      roles,
      size: en(v.size) || null,
      sizeClass: v.size_class ?? null,
      ground: v.is_vehicle || v.is_gravlev ? 1 : 0,
      gravlev: v.is_gravlev ? 1 : 0,
      status: en(v.production_status) || null,
      description: en(v.description) || en(v.game_description) || null,
      length: num(v.dimension?.length ?? v.sizes?.length),
      beam: num(v.dimension?.width ?? v.sizes?.beam),
      height: num(v.dimension?.height ?? v.sizes?.height),
      mass: num(v.mass_total ?? v.mass),
      cargo: num(v.cargo_capacity),
      ore: num(v.ore_capacity),
      inventory: v.vehicle_inventory ? round(v.vehicle_inventory / 1e6, 2) : null,
      crewMin: num(v.crew?.min),
      crewMax: num(v.crew?.max),
      beds: num(v.seating?.beds),
      medTier: num(v.max_medical_tier),
      hp: num(v.health),
      shield: num(v.shield?.hp ?? v.shield_hp),
      shieldType: v.shield?.face_type || v.shield_face_type || null,
      scm: num(v.speed?.scm),
      maxSpeed: num(v.speed?.max),
      boost: num(v.speed?.boost_forward),
      pitch: num(v.agility?.pitch),
      yaw: num(v.agility?.yaw),
      roll: num(v.agility?.roll),
      hydrogen: num(v.fuel?.capacity),
      qtFuel: num(v.quantum?.quantum_fuel_capacity),
      qtSpeed: v.quantum?.quantum_speed ? round(v.quantum.quantum_speed / 1000) : null, // km/s
      qtRange: v.quantum?.quantum_range ? round(v.quantum.quantum_range / 1e9, 1) : null, // Gm
      qtSpool: num(v.quantum?.quantum_spool_time),
      dps: num(v.weaponry?.pilot_dps),
      alpha: num(v.weaponry?.pilot_alpha),
      sustained: num(v.weaponry?.pilot_sustained_dps),
      guns: (v.weaponry?.fixed_weapons?.weapons || []).map(w => w.name),
      missiles: num(v.weaponry?.missiles?.count),
      missileDmg: num(v.weaponry?.total_missile_damage),
      turrets: (v.turrets?.manned?.length || 0) + (v.turrets?.remote?.length || 0) || null,
      claim: num(v.insurance?.claim_time),
      expedite: num(v.insurance?.expedite_time),
      expediteCost: num(v.insurance?.expedite_cost),
      msrp: num(v.msrp),
      warbond: num(v.warbond_price),
      pledgeUrl: v.pledge_url || null,
      pledgeAvailable: (v.skus || []).some(s => s.source === 'pledge_store' && s.available) ? 1 : 0,
      // Real-money store listings (standalone ship, warbond, packages). Upgrade-API entries are skipped.
      skus: (v.skus || []).filter(s => s.source === 'pledge_store' && s.price).map(s => compact({
        title: s.title, url: s.url, price: num(s.price), sale: num(s.discounted_price),
        warbond: s.is_warbond ? 1 : 0, pkg: s.is_package ? 1 : 0, avail: s.available ? 1 : 0,
        seen: s.imported_at ? s.imported_at.slice(0, 10) : null,
      })).sort((a, b) => (b.avail - a.avail) || a.price - b.price),
      loaners: (v.loaner || []).map(l => l.name || l).filter(x => typeof x === 'string'),
      img: img?.thumbnail_url || u?.url_photo || null,
      imgFull: img?.original_url || null,
      gallery: (v.images || []).slice(1, 6).map(i => i.thumbnail_url).filter(Boolean),
      top: fy?.media?.topView?.mediumUrl || null,
      topHi: fy?.media?.topView?.url || null,
      side: fy?.media?.sideView?.mediumUrl || null,
      sideHi: fy?.media?.sideView?.url || null,
      holo: fy?.holo || null,
      fySlug: fy?.slug || null,
      topC: fy?.media?.topViewColored?.mediumUrl || null,
      topCHi: fy?.media?.topViewColored?.url || null,
      sideC: fy?.media?.sideViewColored?.mediumUrl || null,
      sideCHi: fy?.media?.sideViewColored?.url || null,
      angleC: fy?.media?.angledViewColored?.mediumUrl || null,
      fcLen: num(fy?.metrics?.fleetchartOffsetLength) || null,
      fcBeam: num(fy?.metrics?.fleetchartOffsetBeam) || null,
      fleetyards: fy ? `https://fleetyards.net/ships/${fy.slug}` : null,
      trailer: v.curated_data?.trailer_url || u?.url_video || null,
      brochure: v.curated_data?.brochure_url || u?.url_brochure || null,
      wikiPage: v.curated_data?.page_url || null,
      added: v.curated_data?.added_in_version || null,
      concept: v.curated_data?.concept_date || null,
      buy: (v.uex_prices?.purchase || []).map(p => priceRow(p, 'price_buy')).filter(p => p.price).sort((a, b) => a.price - b.price),
      rent: (v.uex_prices?.rental || []).map(p => priceRow(p, 'price_rent')).filter(p => p.price).sort((a, b) => a.price - b.price),
    });
  });

  // Ships FleetYards knows about that the game files don't have yet (concept ships, unreleased variants).
  for (const m of fyModels) {
    if (fyUsed.has(m.slug) || ships.some(x => x.id === m.slug)) continue;
    const met = m.metrics || {};
    const media = m.media || {};
    ships.push(compact({
      id: m.slug, name: m.name, fullName: `${m.manufacturer?.name || ''} ${m.name}`.trim(),
      maker: m.manufacturer?.name || null, makerCode: m.manufacturer?.code || null,
      career: m.classificationLabel || null, role: m.focus || null,
      size: met.sizeLabel || null, ground: met.isGroundVehicle ? 1 : 0,
      status: m.productionStatus || null, isConcept: m.productionStatus !== 'flight-ready' ? 1 : 0,
      description: m.description || null,
      length: num(met.length), beam: num(met.beam), height: num(met.height), mass: num(met.mass), cargo: num(met.cargo),
      crewMax: num(m.crew?.value) || null, scm: num(m.speeds?.scmSpeed), maxSpeed: num(m.speeds?.maxSpeed),
      msrp: num(m.pledgePrice), pledgeUrl: m.links?.storeUrl || null, pledgeAvailable: m.onSale ? 1 : 0,
      salesPage: m.links?.salesPageUrl || null,
      loaners: (m.loaners || []).map(l => l.name).filter(Boolean),
      img: media.storeImage?.mediumUrl || media.angledView?.mediumUrl || null, imgFull: media.storeImage?.url || null,
      top: media.topView?.mediumUrl || null, topHi: media.topView?.url || null,
      side: media.sideView?.mediumUrl || null, sideHi: media.sideView?.url || null,
      topC: media.topViewColored?.mediumUrl || null, topCHi: media.topViewColored?.url || null,
      sideC: media.sideViewColored?.mediumUrl || null, sideCHi: media.sideViewColored?.url || null,
      angleC: media.angledViewColored?.mediumUrl || null,
      holo: m.holo || null, fySlug: m.slug,
      fcLen: num(met.fleetchartOffsetLength) || null, fcBeam: num(met.fleetchartOffsetBeam) || null,
      fleetyards: `https://fleetyards.net/ships/${m.slug}`, brochure: m.brochure || null,
      source: 'fleetyards',
    }));
  }

  // Special editions without their own render borrow their base hull's outline (same geometry).
  const baseName = n => n.replace(/\s+(Wikelo\b.*|PYAM Exec|\d{4} Best In Show Edition|Best In Show.*|Pirate Edition|Executive Edition|Exec)$/i, '').trim();
  for (const s of ships) {
    if (s.top) continue;
    const b = baseName(s.name);
    const twin = ships.find(o => o !== s && o.top && (o.name === b || baseName(o.name) === b))
      || (s.chassis != null && ships.find(o => o !== s && o.top && o.chassis === s.chassis && o.length && s.length && Math.abs(o.length - s.length) / s.length < 0.04));
    if (twin) Object.assign(s, { top: twin.top, topHi: twin.topHi, side: s.side || twin.side, sideHi: s.sideHi || twin.sideHi, holo: s.holo || twin.holo, fcLen: twin.fcLen, fcBeam: twin.fcBeam, outlineFrom: twin.name });
  }
  // Textured renders for variants come from the base hull only when the paint is the same model line.
  for (const s of ships) {
    if (s.topC || !s.outlineFrom) continue;
    const twin = ships.find(o => o.name === s.outlineFrom && o.topC);
    if (twin) Object.assign(s, { topC: twin.topC, topCHi: twin.topCHi, sideC: s.sideC || twin.sideC, sideCHi: s.sideCHi || twin.sideCHi, angleC: s.angleC || twin.angleC });
  }

  try { await wikiPageViews(ships); } catch (e) { console.warn('  wiki views unavailable:', e.message); }

  // Paints for every model (FleetYards), written to their own file.
  const paints = [];
  const withPaints = ships.filter(x => x.fySlug && fyBySlug.get(x.fySlug)?.hasPaints);
  await pool(withPaints, 6, async ship => {
    try {
      const list = await getJson(`https://api.fleetyards.net/v1/models/${ship.fySlug}/paints`);
      for (const pt of (Array.isArray(list) ? list : list.items || [])) {
        const media = pt.media || {};
        paints.push(compact({
          ship: ship.id, name: pt.name,
          img: media.storeImage?.mediumUrl || media.angledView?.mediumUrl || null,
          imgFull: media.storeImage?.url || media.angledView?.url || null,
          top: media.topView?.mediumUrl || null, side: media.sideView?.mediumUrl || null,
        }));
      }
    } catch { /* paints are optional */ }
  });
  const paintCount = new Map();
  for (const pt of paints) paintCount.set(pt.ship, (paintCount.get(pt.ship) || 0) + 1);
  for (const s of ships) if (paintCount.get(s.id)) s.paints = paintCount.get(s.id);
  await write('paints.json', paints.sort((a, b) => a.ship.localeCompare(b.ship) || a.name.localeCompare(b.name)));

  // Variants: other ships on the same chassis.
  const byChassis = new Map();
  for (const s of ships) if (s.chassis != null) {
    if (!byChassis.has(s.chassis)) byChassis.set(s.chassis, []);
    byChassis.get(s.chassis).push(s.id);
  }
  for (const s of ships) {
    const sib = s.chassis != null ? byChassis.get(s.chassis).filter(id => id !== s.id) : [];
    if (sib.length) s.variants = sib;
  }
  ships.sort((a, b) => (a.maker || '').localeCompare(b.maker || '') || a.name.localeCompare(b.name));
  await write('ships.json', ships);
  return { ships: ships.length, paints: paints.length };
}

// ---------------------------------------------------------------- in-game ship views (Star Citizen Wiki)
// The wiki's "Ship profile" table has in-game screenshots of every ship (and many paints)
// from six angles, named "<Ship> in space - <Angle>.jpg".
const WIKI_MW = 'https://starcitizen.tools/api.php';
const ANGLES = ['Isometric', 'Above', 'Port', 'Front', 'Rear', 'Below'];

// Pass 1: search the wiki for every "<name> in space - <angle>" file and match names.
async function wikiSearchViews(ships) {
  const titles = new Set();
  for (const angle of ANGLES) {
    for (let offset = 0; offset < 5000; offset += 500) {
      const r = await getJson(`${WIKI_MW}?action=query&list=search&srsearch=${encodeURIComponent(`intitle:"in space - ${angle}"`)}&srnamespace=6&srlimit=500&sroffset=${offset}&format=json`);
      for (const h of r.query?.search || []) if (VIEW_RE.test(h.title)) titles.add(h.title);
      if (!r.continue) break;
    }
  }
  const key = n => String(n).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/mk ?ii\b/g, 'mk ii').replace(/[^a-z0-9]+/g, ' ').trim();
  const byName = new Map();
  const claim = (n, sh) => { const k = n && key(n); if (k && !byName.has(k)) byName.set(k, sh); };
  for (const sh of ships) { claim(sh.name, sh); claim(sh.fullName, sh); }
  for (const sh of ships) {
    const w = sh.name.split(' ');
    if (w.length > 1 && (/^[A-Z]{2,5}$/.test(w[0]) || (sh.maker && sh.name.startsWith(sh.maker.split(' ')[0])))) claim(w.slice(1).join(' '), sh);
    if (w.length > 2) claim(w.slice(1).join(' '), sh);
    claim(sh.name.replace(/\s+Mk I$/i, ''), sh);
  }
  const ALIAS = { 'mpuv 1c': 'MPUV Cargo', 'mpuv 1p': 'MPUV Personnel', 'mpuv 1t': 'MPUV Tractor', 'hercules c2': 'C2 Hercules Starlifter', 'hercules a2': 'A2 Hercules Starlifter', 'hercules m2': 'M2 Hercules Starlifter', 'c8': 'C8 Pisces', 'c8r': 'C8R Pisces Rescue', 'c8x': 'C8X Pisces Expedition', 'spirit c1': 'C1 Spirit', 'spirit a1': 'A1 Spirit', 'spirit e1': 'E1 Spirit', 'ares inferno': 'Ares Star Fighter Inferno', 'ares ion': 'Ares Star Fighter Ion', 'aurora cl': 'Aurora Mk I CL', 'aurora es': 'Aurora Mk I ES', 'aurora ln': 'Aurora Mk I LN', 'aurora lx': 'Aurora Mk I LX', 'aurora mr': 'Aurora Mk I MR', 'aurora se': 'Aurora Mk I SE' };
  for (const [a, n] of Object.entries(ALIAS)) { const sh = ships.find(x => x.name === n); if (sh && !byName.has(a)) byName.set(a, sh); }
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const wanted = new Map();
  for (const t of titles) {
    const m = t.match(VIEW_RE);
    const base = key(m[1]);
    let ship = byName.get(base), paint = null;
    if (!ship) {
      const prefix = names.find(n => base.startsWith(n + ' '));
      if (prefix) { ship = byName.get(prefix); const w = m[1].split(/\s+/); paint = w.slice(w.length - (base.split(' ').length - prefix.split(' ').length)).join(' '); }
    }
    if (!ship) continue;
    const angle = m[2].toLowerCase() === 'starboard' ? 'port' : m[2].toLowerCase();
    if (paint && !['isometric', 'above', 'port'].includes(angle)) continue;
    wanted.set(t, [{ ship, angle, paint }]);
  }
  return wanted;
}

const VIEW_RE = /^File:(.+?) in (?:space|SelfLand) - (Isometric|Above|Port|Starboard|Front|Rear|Below)(?: \d)?\.(?:jpe?g|png|webp)$/i;

// Looks at the images used on each ship's own wiki page (more reliable than search) and
// picks the profile screenshots: the plain ship plus every paint shown there.
async function wikiPageViews(ships) {
  const wanted = await wikiSearchViews(ships); // file title -> [{ ship, angle, paint }]
  const covered = new Set([...wanted.values()].flat().filter(u => !u.paint).map(u => u.ship));
  const pageOf = s => decodeURIComponent((s.wikiPage || '').replace(/^https?:\/\/starcitizen\.tools\//, '').replace(/_/g, ' ')) || s.name;
  const pages = [...new Set(ships.filter(sh => !covered.has(sh)).map(pageOf))];
  const imagesByPage = new Map();
  const redirects = new Map();
  for (let i = 0; i < pages.length; i += 40) {
    const batch = pages.slice(i, i + 40);
    let cont = '';
    for (let guard = 0; guard < 40; guard++) {
      const r = await getJson(`${WIKI_MW}?action=query&titles=${encodeURIComponent(batch.join('|'))}&prop=images&imlimit=max&redirects=1&format=json${cont}`);
      for (const rd of r.query?.redirects || []) redirects.set(rd.from, rd.to);
      for (const n of r.query?.normalized || []) redirects.set(n.from, n.to);
      for (const pg of Object.values(r.query?.pages || {})) {
        if (!imagesByPage.has(pg.title)) imagesByPage.set(pg.title, []);
        imagesByPage.get(pg.title).push(...(pg.images || []).map(x => x.title));
      }
      if (!r.continue) break;
      cont = Object.entries(r.continue).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('');
    }
  }
  const resolve = t => { let x = t; for (let k = 0; k < 3 && redirects.has(x); k++) x = redirects.get(x); return x; };
  // Pick files per ship page for ships the search didn't cover.
  for (const s of ships.filter(sh => !covered.has(sh))) {
    const files = (imagesByPage.get(resolve(pageOf(s))) || []).map(t => [t, t.match(VIEW_RE)]).filter(([, m]) => m);
    if (!files.length) continue;
    // The plain ship is the shortest base name on its page; longer names are paints.
    const bases = [...new Set(files.map(([, m]) => m[1]))].sort((x, y) => x.length - y.length);
    const plain = bases.find(b => s.name.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(s.name.toLowerCase().split(' ').pop())) || bases[0];
    for (const [title, m] of files) {
      const angle = m[2].toLowerCase() === 'starboard' ? 'port' : m[2].toLowerCase();
      const paint = m[1] === plain ? null : (m[1].toLowerCase().startsWith(plain.toLowerCase() + ' ') ? m[1].slice(plain.length + 1) : m[1]);
      if (paint && !['isometric', 'above', 'port'].includes(angle)) continue; // keep paint sets light
      if (!wanted.has(title)) wanted.set(title, []);
      wanted.get(title).push({ ship: s, angle, paint });
    }
  }
  // Resolve URLs in batches.
  const list = [...wanted.keys()];
  const info = new Map();
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const r = await getJson(`${WIKI_MW}?action=query&titles=${encodeURIComponent(batch.join('|'))}&prop=imageinfo&iiprop=url|size&iiurlwidth=1600&format=json`);
    const norm = new Map((r.query?.normalized || []).map(n => [n.to, n.from]));
    for (const pg of Object.values(r.query?.pages || {})) {
      const ii = pg.imageinfo?.[0];
      if (ii) info.set(norm.get(pg.title) || pg.title, { url: ii.thumburl || ii.url, full: ii.url });
    }
  }
  let views = 0, paints = 0;
  for (const [title, uses] of wanted) {
    const v = info.get(title);
    if (!v) continue;
    const selfland = /in SelfLand/i.test(title);
    for (const { ship, angle, paint } of uses) {
      const view = { url: v.url, full: v.full, ...(selfland ? { bg: 'floor' } : {}) };
      if (paint) {
        ship.paintViews ||= {}; ship.paintViews[paint] ||= {};
        if (!ship.paintViews[paint][angle]) { ship.paintViews[paint][angle] = view; paints++; }
      } else {
        ship.views ||= {};
        // Prefer "in space" shots (cut-out friendly) over hangar-floor ones.
        if (!ship.views[angle] || (ship.views[angle].bg && !selfland)) { if (!ship.views[angle]) views++; ship.views[angle] = view; }
      }
    }
  }
  // Special editions borrow their base ship's views.
  const baseName = n => n.replace(/\s+(Wikelo\b.*|PYAM Exec|\d{4} Best In Show Edition|\d{4} BIS|Best In Show.*|Pirate Edition|Executive Edition|Exec|Emerald|CitizenCon \d{4} Edition)$/i, '').trim();
  let borrowed = 0;
  for (const s of ships) {
    if (s.views) continue;
    const b = baseName(s.name);
    const twin = ships.find(o => o !== s && o.views && (o.name === s.name || o.name === b));
    if (twin) { s.views = twin.views; if (twin.paintViews) s.paintViews = twin.paintViews; if (twin.name !== s.name) s.viewsFrom = twin.name; borrowed++; }
  }
  console.log(`  wiki in-game views: ${views} ship views, ${paints} paint views, ${borrowed} editions borrow their base ship's views`);
}

// ---------------------------------------------------------------- items (weapons, armor, components, consumables)
const ITEM_GROUPS = [
  // [group, wiki type filter, label]
  ['ship-weapons', 'WeaponGun', 'Ship weapons'],
  ['missiles', 'Missile', 'Missiles & torpedoes'],
  ['fps-weapons', 'WeaponPersonal', 'Personal weapons'],
  ['attachments', 'WeaponAttachment', 'Weapon attachments & magazines'],
  ['armor', 'Char_Armor_Helmet', 'Helmets'],
  ['armor', 'Char_Armor_Torso', 'Armor — core'],
  ['armor', 'Char_Armor_Arms', 'Armor — arms'],
  ['armor', 'Char_Armor_Legs', 'Armor — legs'],
  ['armor', 'Char_Armor_Backpack', 'Backpacks'],
  ['armor', 'Char_Armor_Undersuit', 'Undersuits'],
  ['components', 'Shield', 'Shield generators'],
  ['components', 'PowerPlant', 'Power plants'],
  ['components', 'Cooler', 'Coolers'],
  ['components', 'QuantumDrive', 'Quantum drives'],
  ['mining', 'WeaponMining', 'Mining lasers'],
  ['mining', 'MiningModifier', 'Mining modules'],
  ['salvage', 'SalvageHead', 'Salvage heads'],
  ['gear', 'FPS_Consumable', 'Medical & consumables'],
  ['gear', 'Gadget', 'Gadgets & tools'],
  ['food', 'Food', 'Food'],
  ['food', 'Drink', 'Drinks'],
];

function itemStats(i) {
  const s = {};
  const gun = i.vehicle_weapon;
  if (gun && !i.mining_laser) {
    const mode = (gun.modes || [])[0] || {};
    Object.assign(s, {
      kind: gun.type, dps: num(mode.damage_per_second), alpha: num(gun.damage_per_shot), rpm: num(gun.rpm ?? mode.rpm),
      range: num(gun.range), ammo: num(gun.capacity), damage: (gun.damages || []).map(d => d.name).join(', ') || null,
    });
  }
  if (i.personal_weapon) {
    const w = i.personal_weapon;
    const mode = (w.modes || [])[0] || {};
    Object.assign(s, {
      kind: w.type, class: w.class, dps: num(mode.damage_per_second), alpha: num(w.damage_per_shot), rpm: num(w.rpm ?? w.rof),
      range: num(w.effective_range ?? w.range), mag: num(w.magazine_size ?? w.capacity),
      modes: [...new Set((w.modes || []).map(m => (m.localised || m.mode || '').replace(/[[\]]/g, '')).filter(Boolean))].join(' / ') || null,
      damage: (w.damages || []).map(d => d.name).join(', ') || null,
    });
  }
  if (i.missile) {
    const m = i.missile;
    Object.assign(s, {
      kind: m.signal_type, damage: num(m.damage_total), speed: num(m.speed ?? m.flight?.speed), lock: num(m.lock_time),
      range: num(m.lock_range_max), cluster: num(m.cluster_size),
    });
  }
  if (i.suit_armor) {
    const r = i.suit_armor.damage_resistance || {};
    const pct = x => (x === null || x === undefined ? null : round((1 - x) * 100));
    Object.assign(s, {
      slot: i.suit_armor.slot || null,
      physical: pct(r.physical?.multiplier), energy: pct(r.energy?.multiplier), impact: pct(r.impact),
      tempMin: num(i.temperature_resistance?.min), tempMax: num(i.temperature_resistance?.max),
      storage: i.inventory?.scu ? round(i.inventory.scu, 3) : null,
    });
  }
  if (i.shield) Object.assign(s, { hp: num(i.shield.max_health), regen: num(i.shield.regen_rate), downedDelay: num(i.shield.regen_delay?.downed) });
  if (i.power_plant) Object.assign(s, { output: num(i.power_plant.power_output) ?? num(i.power_plant.power_segment_generation) });
  if (i.cooler) Object.assign(s, { cooling: num(i.cooler.cooling_rate) ?? num(i.cooler.coolant_segment_generation) });
  if (i.quantum_drive) {
    const q = i.quantum_drive;
    Object.assign(s, { qtSpeed: q.standard_jump?.drive_speed ? round(q.standard_jump.drive_speed / 1000) : null, cooldown: num(q.standard_jump?.cooldown_time), fuelReq: num(q.quantum_fuel_requirement) });
  }
  if (i.mining_laser) {
    const m = i.mining_laser;
    Object.assign(s, { power: num(m.laser_power?.max), optimal: num(m.optimal_range), maxRange: num(m.maximum_range), modules: num(m.module_slots) });
  }
  if (i.food) {
    const f = i.food;
    Object.assign(s, { hunger: num(f.nutrition?.hunger), thirst: num(f.nutrition?.thirst), effects: (f.effects || []).filter(x => typeof x === 'string').join(', ') || null });
  }
  if (i.medical) {
    const m = i.medical;
    Object.assign(s, { bdl: num(m.nutrition?.blood_drug_level), effects: Object.keys(m.combat_buffs || {}).map(k => k.replace(/_/g, ' ')).join(', ') || null });
  }
  return compact(s);
}

async function buildItems() {
  console.log('→ items (Star Citizen Wiki) + shop prices (UEX)');
  const [{ map: terminals }, prices] = await Promise.all([loadTerminals(), uex('items_prices_all')]);
  const pricesByUuid = new Map();
  const pricesByName = new Map();
  for (const p of prices) {
    if (!p.price_buy) continue;
    const t = terminals.get(p.id_terminal);
    if (!t) continue;
    const row = { price: num(p.price_buy), terminalId: p.id_terminal };
    if (p.item_uuid) {
      if (!pricesByUuid.has(p.item_uuid)) pricesByUuid.set(p.item_uuid, []);
      pricesByUuid.get(p.item_uuid).push(row);
    }
    const nk = slugify(p.item_name || '');
    if (!pricesByName.has(nk)) pricesByName.set(nk, []);
    pricesByName.get(nk).push(row);
  }

  const items = [];
  const seen = new Set();
  for (const [group, type, label] of ITEM_GROUPS) {
    let rows = [];
    try { rows = await wikiAll(`items?filter%5Btype%5D=${type}`, 50); } catch (e) { console.warn(`  skip ${type}: ${e.message}`); continue; }
    console.log(`  ${type}: ${rows.length}`);
    for (const i of rows) {
      if (seen.has(i.uuid)) continue;
      const name = i.name || '';
      if (!name || /placeholder|^<=|PLACEHOLDER|\[PH\]/i.test(name)) continue;
      const buy = (pricesByUuid.get(i.uuid) || pricesByName.get(slugify(name)) || [])
        .sort((a, b) => a.price - b.price).slice(0, 40);
      // Keep everything that is purchasable, plus weapons/armor/components even if loot-only.
      if (!buy.length && ['food', 'gear', 'attachments'].includes(group) && !i.is_lootable) continue;
      seen.add(i.uuid);
      items.push(compact({
        id: i.uuid,
        name,
        group,
        cat: label,
        type: i.type,
        sub: i.sub_type_label && i.sub_type_label !== 'UNDEFINED' ? i.sub_type_label : null,
        size: num(i.size),
        grade: i.grade || null,
        cls: i.class || null,
        maker: i.manufacturer?.name && i.manufacturer.name !== 'Unknown Manufacturer' ? i.manufacturer.name : null,
        desc: (en(i.description) || '').replace(/^(Manufacturer|Item Type|Size|Grade|Class|Hersteller)[^\n]*\n/gm, '').trim().slice(0, 600) || null,
        loot: i.is_lootable ? 1 : 0,
        craft: i.is_craftable ? 1 : 0,
        stats: itemStats(i),
        img: (i.images || [])[0]?.thumbnail_url || null,
        buy,
      }));
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  await write('items.json', items);
  return { items: items.length };
}

// ---------------------------------------------------------------- locations (places with shops)
async function buildLocations() {
  console.log('→ locations & shops (UEX)');
  const { map: terminals } = await loadTerminals();
  let stations = [], cities = [], outposts = [];
  try { [stations, cities, outposts] = await Promise.all([uex('space_stations'), uex('cities'), uex('outposts')]); } catch { /* optional */ }
  const facilities = new Map();
  for (const s of [...stations, ...cities, ...outposts]) facilities.set(slugify(`${s.star_system_name}-${s.name}`), s);

  const places = new Map();
  for (const t of terminals.values()) {
    if (!places.has(t.placeId)) {
      const f = facilities.get(t.placeId);
      places.set(t.placeId, compact({
        id: t.placeId, name: t.place, kind: t.placeKind, system: t.system, planet: t.planet, moon: t.moon, orbit: t.orbit,
        armistice: f?.is_armistice ? 1 : 0, monitored: f?.is_monitored ? 1 : 0, landable: f?.is_landable ? 1 : 0,
        pads: f?.pad_types || null, hab: f?.has_habitation ? 1 : 0, clinic: f?.has_clinic ? 1 : 0, food: f?.has_food ? 1 : 0,
        shops: f?.has_shops ? 1 : 0, refuel: f?.has_refuel ? 1 : 0, repair: f?.has_repair ? 1 : 0, refinery: f?.has_refinery ? 1 : 0,
        faction: t.faction,
      }));
      places.get(t.placeId).terminals = [];
    }
    const p = places.get(t.placeId);
    p.terminals.push(compact({ id: t.id, name: t.name, type: t.type, company: t.company, food: t.food, fps: t.fps, vehicle: t.vehicle, refuel: t.refuel, repair: t.repair, medical: t.medical, refinery: t.refinery, cargo: t.cargo, maxContainer: t.maxContainer }));
    for (const k of ['food', 'refuel', 'repair', 'refinery']) if (t[k]) p[k] = 1;
    if (t.medical) p.clinic = 1;
    if (t.fps || t.vehicle) p.shops = 1;
    if (t.habitation) p.hab = 1;
  }
  const list = [...places.values()].sort((a, b) => (a.system || '').localeCompare(b.system || '') || a.name.localeCompare(b.name));
  const terminalList = [...terminals.values()].map(t => compact({ id: t.id, name: t.name, place: t.place, placeId: t.placeId, system: t.system, planet: t.planet, moon: t.moon, type: t.type }));
  await write('locations.json', list);
  await write('terminals.json', terminalList);
  return { locations: list.length, terminals: terminalList.length };
}

// ---------------------------------------------------------------- news & videos
function parseFeed(xml, max = 30) {
  const entries = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) || [];
  const tag = (b, t) => {
    const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`));
    return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : null;
  };
  const decode = s => s && s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
  for (const b of blocks.slice(0, max)) {
    const link = tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/) || [])[1];
    const vid = tag(b, 'yt:videoId');
    const thumb = (b.match(/<media:thumbnail[^>]*url="([^"]+)"/) || [])[1] || (b.match(/<enclosure[^>]*url="([^"]+)"/) || [])[1] || null;
    let summary = decode(tag(b, 'description') || tag(b, 'media:description') || tag(b, 'summary') || '');
    summary = (summary || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280);
    entries.push(compact({ title: decode(tag(b, 'title')), link: decode(link), date: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated'), summary, videoId: vid, thumb }));
  }
  return entries;
}

async function buildNews() {
  console.log('→ news & videos');
  const out = { updated: new Date().toISOString(), commLinks: [], videos: [] };
  try {
    const res = await getJson(`${WIKI}/comm-links?page%5Bsize%5D=40`, { cache: false });
    out.commLinks = (res.data || []).map(c => {
      const body = en(c.translations) || '';
      return compact({
        id: c.id,
        title: c.title,
        link: c.rsi_url,
        date: c.created_at,
        channel: c.channel && c.channel !== 'Undefined' ? c.channel : null,
        category: c.category && c.category !== 'Undefined' ? c.category : null,
        series: c.series && c.series !== 'None' ? c.series : null,
        summary: body.replace(/\s+/g, ' ').trim().slice(0, 320) || null,
      });
    });
    console.log(`  comm-links: ${out.commLinks.length}`);
  } catch (e) { console.warn('  comm-links unavailable:', e.message); }
  try {
    out.videos = await latestVideos(24);
    console.log(`  videos: ${out.videos.length}`);
  } catch (e) { console.warn('  videos unavailable:', e.message); }
  try { out.versions = await uex('game_versions'); } catch { /* optional */ }
  await write('news.json', out);
  return { news: out.commLinks.length, videos: out.videos.length };
}

// ---------------------------------------------------------------- main
const counts = {};
const steps = [
  ['missions', buildMissions],
  ['ships', buildShips],
  ['items', buildItems],
  ['locations', buildLocations],
  ['news', buildNews],
];
for (const [name, fn] of steps) {
  if (!want(name)) continue;
  try { Object.assign(counts, await fn()); }
  catch (e) { console.error(`✖ ${name} failed:`, e); process.exitCode = 1; }
}

let gameVersion = null;
try { gameVersion = (await uex('game_versions')).live; } catch { /* optional */ }
const metaFile = path.join(OUT, 'meta.json');
const prev = existsSync(metaFile) ? JSON.parse(await readFile(metaFile, 'utf8')) : {};
await write('meta.json', {
  ...prev,
  gameVersion: gameVersion || prev.gameVersion || null,
  generatedAt: new Date().toISOString(),
  counts: { ...(prev.counts || {}), ...counts },
  sources: [
    { name: 'Star Citizen Wiki API', url: 'https://api.star-citizen.wiki', covers: 'Missions, factions, ships, items & stats' },
    { name: 'UEX Corp', url: 'https://uexcorp.space', covers: 'Shop locations and in-game prices' },
    { name: 'FleetYards', url: 'https://fleetyards.net', covers: 'Top and side ship renders for the fleet lineup' },
    { name: 'Roberts Space Industries', url: 'https://robertsspaceindustries.com', covers: 'Comm-links, citizen profiles' },
  ],
});
