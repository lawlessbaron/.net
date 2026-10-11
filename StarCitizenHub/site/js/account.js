// Optional accounts (Discord sign-in). Signed-out visitors keep everything in this
// browser; signed-in users get the same data synced to their account.
import { store, toast } from './lib.js';

const SYNCED = ['fleet', 'rep', 'repLog', 'guideDone', 'prefs'];
const listeners = new Set();
export const session = { enabled: false, user: null, ready: false };

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'X-Verse-Atlas': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json().catch(() => ({})) : {};
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const onSession = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn(session));

const isEmpty = v => v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

// Pending writes are debounced per key.
const timers = new Map();
function queueSave(key, value) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(async () => {
    try { await api(`/api/state/${key}`, { method: 'PUT', body: { value } }); }
    catch (e) { if (e.status === 401) { session.user = null; emit(); } else toast(`Couldn't save to your account: ${e.message}`, 'warn'); }
  }, 600));
}

export async function initAccount() {
  try {
    const me = await api('/api/me');
    session.enabled = !!me.enabled;
    session.user = me.user || null;
  } catch { session.enabled = false; }
  if (session.user) await pullState();
  session.ready = true;
  emit();
  store.subscribe((key, value) => { if (session.user && SYNCED.includes(key)) queueSave(key, value); });
}

// First sign-in on a device: account data wins where it exists; otherwise this
// browser's data is uploaded so nothing collected before signing in is lost.
async function pullState() {
  try {
    const remote = await api('/api/state');
    for (const key of SYNCED) {
      const local = store.get(key, null);
      if (!isEmpty(remote[key])) store.set(key, remote[key], { silent: true });
      else if (!isEmpty(local)) queueSave(key, local);
    }
  } catch { /* keep local data */ }
}

export async function refreshUser() {
  const me = await api('/api/me');
  session.user = me.user || null;
  emit();
  return session.user;
}

export const signIn = () => { location.href = '/auth/discord'; };
export async function signOut() {
  await api('/auth/logout', { method: 'POST' }).catch(() => {});
  session.user = null;
  emit();
  toast('Signed out. Your data stays saved in this browser too.');
}
