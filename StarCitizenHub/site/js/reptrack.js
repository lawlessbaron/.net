// Reputation tracker: standings per faction plus a log of what changed them.
// Stored under "rep" and "repLog", which sync to the user's account when signed in.
import { store } from './lib.js';

const LOG_MAX = 500;
export const getReps = () => store.get('rep', {});
export const getLog = () => store.get('repLog', []);

function push(entry) {
  const log = getLog();
  log.unshift({ t: new Date().toISOString(), ...entry });
  store.set('repLog', log.slice(0, LOG_MAX));
}

// Applies a contract result. Returns { from, to, known } where known says whether
// the player had told us their standing before (otherwise we start from 0).
export function applyRep({ factionId, faction, amount, missionId, title, kind }) {
  const reps = getReps();
  const known = reps[factionId] !== undefined;
  const from = known ? reps[factionId] : 0;
  const to = from + amount;
  reps[factionId] = to;
  store.set('rep', reps);
  push({ kind, missionId, title, factionId, faction, amount, from, to });
  return { from, to, known };
}

export function setRep({ factionId, faction, value }) {
  const reps = getReps();
  const from = reps[factionId];
  if (value === null || value === undefined) delete reps[factionId];
  else reps[factionId] = value;
  store.set('rep', reps);
  if (value != null) push({ kind: 'set', title: 'Standing updated by hand', factionId, faction, amount: value - (from || 0), from: from ?? null, to: value });
}

// Undo the most recent log entry (optionally for one faction).
export function undoLast(factionId) {
  const log = getLog();
  const i = log.findIndex(e => !factionId || e.factionId === factionId);
  if (i < 0) return null;
  const [e] = log.splice(i, 1);
  const reps = getReps();
  if (e.from === null || e.from === undefined) delete reps[e.factionId]; else reps[e.factionId] = e.from;
  store.set('rep', reps);
  store.set('repLog', log);
  return e;
}
