// Postgres storage for accounts, sessions and per-user saved state.
// Accounts are optional: without DATABASE_URL the site runs as before, with
// everything saved in the visitor's browser.
import pg from 'pg';

export const STATE_KEYS = ['fleet', 'rep', 'repLog', 'guideDone', 'prefs'];
const MAX_STATE_BYTES = 256 * 1024;

let pool = null;

export function dbEnabled() { return !!pool; }

export async function initDb(url = process.env.DATABASE_URL) {
  if (!url) return false;
  const local = /localhost|127\.0\.0\.1|\/var\/|\.railway\.internal/.test(url);
  pool = new pg.Pool({ connectionString: url, max: 8, ssl: local ? false : { rejectUnauthorized: false } });
  await migrate();
  return true;
}

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            BIGSERIAL PRIMARY KEY,
      discord_id    TEXT UNIQUE NOT NULL,
      name          TEXT NOT NULL,
      avatar        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login    TIMESTAMPTZ NOT NULL DEFAULT now(),
      rsi_handle    TEXT,
      rsi_handle_lc TEXT UNIQUE,
      rsi_card      JSONB,
      rsi_pending   TEXT,
      rsi_code      TEXT,
      public_fleet  BOOLEAN NOT NULL DEFAULT false
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS suggestions (
      id         BIGSERIAL PRIMARY KEY,
      user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL DEFAULT '',
      category   TEXT NOT NULL DEFAULT 'Other',
      status     TEXT NOT NULL DEFAULT 'Open',
      admin_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS suggestion_votes (
      suggestion_id BIGINT NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
      user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (suggestion_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS user_state (
      user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key        TEXT NOT NULL,
      value      JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, key)
    );
  `);
}

const q = (text, params) => pool.query(text, params);

export async function upsertDiscordUser({ discordId, name, avatar }) {
  const { rows } = await q(
    `INSERT INTO users (discord_id, name, avatar) VALUES ($1, $2, $3)
     ON CONFLICT (discord_id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar, last_login = now()
     RETURNING *`, [discordId, name, avatar]);
  return rows[0];
}

export async function createSession(userId, tokenHash, days = 30) {
  await q(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`, [tokenHash, userId, String(days)]);
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
}
export async function userForSession(tokenHash) {
  const { rows } = await q(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`, [tokenHash]);
  return rows[0] || null;
}
export const deleteSession = tokenHash => q(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);

export async function getState(userId) {
  const { rows } = await q(`SELECT key, value, updated_at FROM user_state WHERE user_id = $1`, [userId]);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
export async function putState(userId, key, value) {
  if (!STATE_KEYS.includes(key)) throw Object.assign(new Error('Unknown setting'), { status: 400 });
  const json = JSON.stringify(value);
  if (json.length > MAX_STATE_BYTES) throw Object.assign(new Error('That is too much data to save'), { status: 413 });
  await q(`INSERT INTO user_state (user_id, key, value, updated_at) VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [userId, key, json]);
}

export async function setRsiClaim(userId, handle, code) {
  await q(`UPDATE users SET rsi_pending = $2, rsi_code = $3 WHERE id = $1`, [userId, handle, code]);
}
export async function setRsiVerified(userId, handle, card) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Whoever proves ownership via their RSI bio wins the handle.
    await client.query(`UPDATE users SET rsi_handle = NULL, rsi_handle_lc = NULL, rsi_card = NULL, public_fleet = false WHERE rsi_handle_lc = $1 AND id <> $2`, [handle.toLowerCase(), userId]);
    await client.query(`UPDATE users SET rsi_handle = $2, rsi_handle_lc = $3, rsi_card = $4, rsi_pending = NULL, rsi_code = NULL WHERE id = $1`, [userId, handle, handle.toLowerCase(), card]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
export const unlinkRsi = userId => q(`UPDATE users SET rsi_handle = NULL, rsi_handle_lc = NULL, rsi_card = NULL, public_fleet = false WHERE id = $1`, [userId]);
export const setPublicFleet = (userId, on) => q(`UPDATE users SET public_fleet = $2 WHERE id = $1`, [userId, !!on]);

export async function publicProfile(handle) {
  const { rows } = await q(`SELECT id, rsi_handle, rsi_card, public_fleet FROM users WHERE rsi_handle_lc = $1`, [handle.toLowerCase()]);
  const u = rows[0];
  if (!u || !u.public_fleet) return null;
  const st = await getState(u.id);
  return { handle: u.rsi_handle, card: u.rsi_card, fleet: st.fleet || [] };
}

export async function exportUser(userId) {
  const { rows } = await q(`SELECT discord_id, name, created_at, last_login, rsi_handle, rsi_card, public_fleet FROM users WHERE id = $1`, [userId]);
  const sug = await q(`SELECT title, body, category, status, created_at FROM suggestions WHERE user_id = $1 ORDER BY created_at`, [userId]);
  return { account: rows[0], saved: await getState(userId), suggestions: sug.rows };
}
export const deleteUser = userId => q(`DELETE FROM users WHERE id = $1`, [userId]);

// ---------------------------------------------------------------- suggestions
export const SUGGESTION_STATUSES = ['Open', 'Planned', 'In progress', 'Done', 'Declined'];
export const SUGGESTION_CATEGORIES = ['Missions', 'Ships', 'Items & shops', 'Locations', 'Fleet', 'Guide', 'Events', 'Site', 'Other'];

export async function listSuggestions(viewerId, { sort = 'top', status = '' } = {}) {
  const params = [viewerId || 0];
  let where = '';
  if (status && SUGGESTION_STATUSES.includes(status)) { params.push(status); where = `WHERE s.status = $${params.length}`; }
  const order = sort === 'new' ? 's.created_at DESC' : 'votes DESC, s.created_at DESC';
  const { rows } = await q(`
    SELECT s.id, s.title, s.body, s.category, s.status, s.admin_note, s.created_at, s.updated_at, s.user_id,
           u.name AS author, u.rsi_handle AS author_handle,
           (SELECT count(*)::int FROM suggestion_votes v WHERE v.suggestion_id = s.id) AS votes,
           EXISTS (SELECT 1 FROM suggestion_votes v WHERE v.suggestion_id = s.id AND v.user_id = $1) AS voted
    FROM suggestions s LEFT JOIN users u ON u.id = s.user_id
    ${where} ORDER BY ${order} LIMIT 300`, params);
  return rows.map(r => ({ ...r, id: String(r.id), mine: !!viewerId && String(r.user_id) === String(viewerId), user_id: undefined }));
}
export async function countRecentSuggestions(userId) {
  const { rows } = await q(`SELECT count(*)::int AS n FROM suggestions WHERE user_id = $1 AND created_at > now() - interval '1 day'`, [userId]);
  return rows[0].n;
}
export async function createSuggestion(userId, { title, body, category }) {
  const { rows } = await q(`INSERT INTO suggestions (user_id, title, body, category) VALUES ($1, $2, $3, $4) RETURNING id`, [userId, title, body, category]);
  await q(`INSERT INTO suggestion_votes (suggestion_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [rows[0].id, userId]);
  return String(rows[0].id);
}
export async function voteSuggestion(id, userId, on) {
  if (on) await q(`INSERT INTO suggestion_votes (suggestion_id, user_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM suggestions WHERE id = $1) ON CONFLICT DO NOTHING`, [id, userId]);
  else await q(`DELETE FROM suggestion_votes WHERE suggestion_id = $1 AND user_id = $2`, [id, userId]);
}
export async function updateSuggestionStatus(id, status, note) {
  await q(`UPDATE suggestions SET status = $2, admin_note = $3, updated_at = now() WHERE id = $1`, [id, status, note || null]);
}
export async function suggestionOwner(id) {
  const { rows } = await q(`SELECT user_id FROM suggestions WHERE id = $1`, [id]);
  return rows[0] ? String(rows[0].user_id) : null;
}
export const deleteSuggestion = id => q(`DELETE FROM suggestions WHERE id = $1`, [id]);

export async function closeDb() { await pool?.end(); pool = null; }
