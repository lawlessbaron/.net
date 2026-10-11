// The user's fleet, kept in this browser.
// Entry: { uid, shipId, name (custom), source: 'manual'|'import', insurance, pledge, note }
import { store, toast } from './lib.js';

export const getFleet = () => store.get('fleet', []);
export const saveFleet = list => store.set('fleet', list);
const uid = () => Math.random().toString(36).slice(2, 10);

export function addShip(shipId, extra = {}) {
  const list = getFleet();
  list.push({ uid: uid(), shipId, source: 'manual', ...extra });
  saveFleet(list);
  return list;
}
export function removeShip(entryUid) {
  const list = getFleet().filter(e => e.uid !== entryUid);
  saveFleet(list);
  return list;
}
export const fleetCount = shipId => getFleet().filter(e => e.shipId === shipId).length;

// Compare tray: up to 4 ship ids.
export const getCompare = () => store.get('compare', []);
export function toggleCompare(id) {
  let list = getCompare();
  if (list.includes(id)) list = list.filter(x => x !== id);
  else if (list.length >= 4) { toast('You can compare up to 4 ships. Remove one first.', 'warn'); return list; }
  else list = [...list, id];
  store.set('compare', list);
  return list;
}
export const clearCompare = () => store.set('compare', []);
