// Ogre & Orc Siege — static game plus a small accounts API.
// Accounts exist for one reason: carrying prestige and the tower storage bin
// across devices. Name + 4-6 digit PIN, PBKDF2-hashed, D1-backed sessions.

// Workers caps PBKDF2 at 100000 iterations
const PIN_ITERATIONS = 100000;
const SESSION_SECONDS = 60 * 60 * 24 * 180;
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const COOKIE = 'osid';
const MAX_STORED = 400;
const MAX_LEVEL = 10;

// The era roster. Artillery is deliberately absent: it is shelved content and can
// never be held in a bin, so the server refuses it even if a client sends one.
const TOWER_IDS = new Set([
  'archer',
  'cannon',
  'ballista',
  'frost',
  'gatling',
  'mortar',
  'flame',
  'tesla',
  'sniper',
  'missile',
  'radar',
  'autocannon',
  'laser',
  'plasma',
  'emp',
  'accelerator',
  'quantum',
  'singularity',
  'drone',
  'stormgen',
]);

/** Pre-era tower ids, carried to the technology that replaced them. */
const LEGACY_TOWER_ID = {
  barrage: 'archer',
  heavy: 'mortar',
  fire: 'flame',
  ice: 'frost',
  lava: 'plasma',
  doors: 'frost',
  inferno: 'plasma',
  storm: 'stormgen',
  siege: 'sniper',
  artillery: 'accelerator',
};

/** A posted save may still name an old id; map it before the whitelist runs. */
function migrateTowerId(raw) {
  if (TOWER_IDS.has(raw)) return raw;
  const mapped = LEGACY_TOWER_ID[raw];
  return mapped && TOWER_IDS.has(mapped) ? mapped : null;
}

let schemaReady = null;

/** Tables are created once per isolate; every request below can assume them. */
function ensureSchema(env) {
  if (!schemaReady) {
    // one statement per entry: D1 splits exec() on newlines, batch() does not
    schemaReady = env.DB.batch([
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE, pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL, created_at INTEGER NOT NULL)',
      ),
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, account_id INTEGER NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
      ),
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS saves (account_id INTEGER PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)',
      ),
      env.DB.prepare(
        'CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)',
      ),
    ]).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function reply(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function sameOrigin(request, url) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === url.host;
  } catch {
    return false;
  }
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derivePin(pin, saltBase64) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltBase64), iterations: PIN_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return base64(bits);
}

function cleanName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 20) return null;
  if (!/^[A-Za-z0-9 ._-]+$/.test(name)) return null;
  return name;
}

function cleanPin(value) {
  if (typeof value !== 'string') return null;
  const pin = value.trim();
  if (!/^\d{4,6}$/.test(pin)) return null;
  return pin;
}

/** Server-side clamp so a tampered client cannot post absurd progress. */
function sanitizeSave(input) {
  const prestige = Number.isInteger(input?.prestige)
    ? Math.max(0, Math.min(999, input.prestige))
    : 0;

  // schema marker: saves without it predate the ten-level towers
  const version = Number.isInteger(input?.version) ? Math.max(1, Math.min(99, input.version)) : 1;

  // deepest endless wave survived; saves from before Endless simply have none
  const endlessBest = Number.isInteger(input?.endlessBest)
    ? Math.max(0, Math.min(1_000_000, input.endlessBest))
    : 0;

  const stored = [];
  if (Array.isArray(input?.stored)) {
    for (const item of input.stored.slice(0, MAX_STORED)) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.id !== 'string') continue;
      const id = migrateTowerId(item.id);
      if (!id) continue;
      const level = Number.isInteger(item.level) ? Math.max(1, Math.min(MAX_LEVEL, item.level)) : 1;
      const invested = Number.isFinite(item.invested)
        ? Math.max(0, Math.min(10_000_000, Math.floor(item.invested)))
        : 0;
      stored.push({ id, level, invested });
    }
  }

  return { prestige, stored, endlessBest, version };
}

async function accountFor(env, request) {
  const token = readCookie(request, COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT a.id AS id, a.name AS name, s.token AS token
       FROM sessions s JOIN accounts a ON a.id = s.account_id
      WHERE s.token = ? AND s.expires_at > ?`,
  )
    .bind(token, Date.now())
    .first();
  if (!row) return null;
  return { id: row.id, name: row.name, token: row.token };
}

async function loadSave(env, accountId) {
  const row = await env.DB.prepare('SELECT data FROM saves WHERE account_id = ?')
    .bind(accountId)
    .first();
  if (!row) return null;
  try {
    return sanitizeSave(JSON.parse(row.data));
  } catch {
    return null;
  }
}

async function startSession(env, accountId) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO sessions (token, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
    .bind(token, accountId, now, now + SESSION_SECONDS * 1000)
    .run();
  return token;
}

async function attemptCount(env, key) {
  const row = await env.DB.prepare('SELECT count, reset_at FROM attempts WHERE key = ?')
    .bind(key)
    .first();
  if (!row) return 0;
  if (row.reset_at < Date.now()) return 0;
  return row.count;
}

async function noteFailure(env, key) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO attempts (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN attempts.reset_at < ? THEN 1 ELSE attempts.count + 1 END,
         reset_at = CASE WHEN attempts.reset_at < ? THEN excluded.reset_at ELSE attempts.reset_at END`,
  )
    .bind(key, now + ATTEMPT_WINDOW_MS, now, now)
    .run();
}

async function clearFailures(env, key) {
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

async function handleRegister(request, env) {
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  const pin = cleanPin(body?.pin);
  if (!name) return reply(400, { ok: false, error: 'Name must be 2-20 letters or numbers.' });
  if (!pin) return reply(400, { ok: false, error: 'PIN must be 4 to 6 digits.' });

  const nameKey = name.toLowerCase();
  const existing = await env.DB.prepare('SELECT id FROM accounts WHERE name_key = ?')
    .bind(nameKey)
    .first();
  if (existing) return reply(409, { ok: false, error: 'That name is already taken.' });

  const salt = base64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivePin(pin, salt);
  const created = Date.now();

  const inserted = await env.DB.prepare(
    'INSERT INTO accounts (name, name_key, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(name, nameKey, hash, salt, created)
    .run();

  const accountId = inserted.meta?.last_row_id;
  if (!accountId) return reply(500, { ok: false, error: 'Could not create that account.' });

  const token = await startSession(env, accountId);
  return reply(
    200,
    { ok: true, name, save: null },
    { 'set-cookie': sessionCookie(token) },
  );
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => null);
  const name = cleanName(body?.name);
  const pin = cleanPin(body?.pin);
  if (!name || !pin) return reply(400, { ok: false, error: 'Enter your name and 4-6 digit PIN.' });

  const key = `login:${name.toLowerCase()}`;
  if ((await attemptCount(env, key)) >= MAX_ATTEMPTS) {
    return reply(429, { ok: false, error: 'Too many attempts. Try again in a few minutes.' });
  }

  const row = await env.DB.prepare(
    'SELECT id, name, pin_hash, pin_salt FROM accounts WHERE name_key = ?',
  )
    .bind(name.toLowerCase())
    .first();

  if (!row) {
    await noteFailure(env, key);
    return reply(401, { ok: false, error: 'Name or PIN is wrong.' });
  }

  const hash = await derivePin(pin, row.pin_salt);
  if (hash !== row.pin_hash) {
    await noteFailure(env, key);
    return reply(401, { ok: false, error: 'Name or PIN is wrong.' });
  }

  await clearFailures(env, key);
  const save = await loadSave(env, row.id);
  const token = await startSession(env, row.id);
  return reply(
    200,
    { ok: true, name: row.name, save },
    { 'set-cookie': sessionCookie(token) },
  );
}

async function handleSave(request, env, account) {
  const body = await request.json().catch(() => null);
  if (!body) return reply(400, { ok: false, error: 'Missing save payload.' });
  const save = sanitizeSave(body);
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO saves (account_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  )
    .bind(account.id, JSON.stringify(save), now)
    .run();
  return reply(200, { ok: true, updatedAt: now });
}

async function handleApi(request, env, url) {
  if (!env.DB) return reply(503, { ok: false, error: 'Accounts are not configured.' });
  await ensureSchema(env);

  const path = url.pathname;
  const method = request.method;

  if (method !== 'GET' && !sameOrigin(request, url)) {
    return reply(403, { ok: false, error: 'Cross-origin request refused.' });
  }

  if (method === 'POST' && path === '/api/register') return handleRegister(request, env);
  if (method === 'POST' && path === '/api/login') return handleLogin(request, env);

  const account = await accountFor(env, request);

  if (method === 'POST' && path === '/api/logout') {
    if (account) {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(account.token).run();
    }
    return reply(200, { ok: true }, { 'set-cookie': sessionCookie('', 0) });
  }

  if (method === 'GET' && path === '/api/me') {
    if (!account) return reply(401, { ok: false, error: 'signed-out' });
    return reply(200, { ok: true, name: account.name, save: await loadSave(env, account.id) });
  }

  if ((method === 'PUT' || method === 'POST') && path === '/api/save') {
    if (!account) return reply(401, { ok: false, error: 'signed-out' });
    return handleSave(request, env, account);
  }

  // wipes the account's progress row: the player starts from nothing again
  if (method === 'DELETE' && path === '/api/save') {
    if (!account) return reply(401, { ok: false, error: 'signed-out' });
    await env.DB.prepare('DELETE FROM saves WHERE account_id = ?').bind(account.id).run();
    return reply(200, { ok: true });
  }

  return reply(404, { ok: false, error: 'Unknown endpoint.' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        console.error('accounts api failed', error);
        return reply(500, { ok: false, error: 'Server error.' });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
