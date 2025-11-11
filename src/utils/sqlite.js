import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let SQL = null;
let db = null;

function bytesToBase64(bytes){
  let binary = '';
  const len = bytes.length;
  for (let i=0; i<len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToBytes(b64){
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i=0; i<len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// --- Auth helpers: PBKDF2 password hashing using Web Crypto ---
async function pbkdf2Hash(password, saltBytes, iterations = 100000, keyLen = 32) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' }, keyMaterial, keyLen * 8);
  return new Uint8Array(bits);
}
function randomBytes(n){ const arr = new Uint8Array(n); crypto.getRandomValues(arr); return arr; }
function b64ToBytes(b){ return base64ToBytes(b); }

export async function initDB(){
  if (db) return db;
  if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
  // Prefer loading remote DB only if explicitly configured
  const remoteUrl = import.meta?.env?.VITE_SQLITE_URL || null;
  if (remoteUrl) {
    try {
      console.log('[initDB] attempting remote SQLite load', { url: remoteUrl });
      await loadRemoteDB(remoteUrl);
      console.log('[initDB] remote SQLite loaded OK');
    } catch (e) {
      console.warn('[initDB] remote SQLite load failed; falling back to empty DB', { url: remoteUrl, error: e?.message||String(e) });
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }
  // Ensure schema (idempotent)
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS devs (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, wip_limit INTEGER);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('migration','newbuild')),
      stage TEXT NOT NULL CHECK (stage IN ('planning','template_build','review','final_updates','production','canceled')),
      created_at TEXT NOT NULL,
      started_at TEXT NULL,
      completed_at TEXT NULL,
      target_days INTEGER NOT NULL,
      assigned_dev_id INTEGER NOT NULL,
      FOREIGN KEY (assigned_dev_id) REFERENCES devs(id) ON UPDATE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 100000,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function readSnapshot(){
  if (!db) await initDB();
  const out = { developers: [], wipLimits: {}, stageWipLimits: {}, projects: [], targetAllCompletionDate: null };
  const devsRes = db.exec('SELECT id, name, wip_limit FROM devs ORDER BY id ASC');
  if (devsRes[0]) {
    const rows = devsRes[0].values;
    out.developers = rows.map(r => r[1]);
    rows.forEach(r => { if (r[2] !== null && r[2] !== undefined) out.wipLimits[r[1]] = Number(r[2]); });
  }
  const mapDev = new Map();
  if (devsRes[0]) devsRes[0].values.forEach(r => mapDev.set(r[0], r[1]));
  const projRes = db.exec('SELECT id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id FROM projects ORDER BY id ASC');
  if (projRes[0]) {
    const rows = projRes[0].values;
    out.projects = rows.map(r => ({ id: Number(r[0]), name: r[1], type: r[2], stage: r[3], createdAt: r[4], startedAt: r[5], completedAt: r[6], targetDays: Number(r[7]), assignedDev: mapDev.get(r[8]) || 'Unknown' }));
  }
  const setDate = db.exec("SELECT value FROM settings WHERE key='target_all_completion_date' LIMIT 1");
  if (setDate[0] && setDate[0].values[0]) out.targetAllCompletionDate = String(setDate[0].values[0][0]);
  const setStageWip = db.exec("SELECT value FROM settings WHERE key='stage_wip_limits' LIMIT 1");
  if (setStageWip[0] && setStageWip[0].values[0]) { try { out.stageWipLimits = JSON.parse(String(setStageWip[0].values[0][0])) || {}; } catch {} }
  return out;
}

export async function writeSnapshot(snapshot){
  if (!db) await initDB();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec('DELETE FROM projects; DELETE FROM devs; DELETE FROM settings;');
    const devIds = new Map();
    const stmtDev = db.prepare('INSERT INTO devs (id, name, wip_limit) VALUES (?, ?, ?)');
    snapshot.developers.forEach((name, idx) => {
      const id = idx + 1;
      devIds.set(name, id);
      stmtDev.run([id, name, Object.prototype.hasOwnProperty.call(snapshot.wipLimits, name) ? Number(snapshot.wipLimits[name]) : null]);
    });
    stmtDev.free();
    const stmtProj = db.prepare('INSERT INTO projects (id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id) VALUES (?,?,?,?,?,?,?,?,?)');
    snapshot.projects.forEach(p => {
      const devId = devIds.get(p.assignedDev);
      const startedAt = p.startedAt || null;
      const completedAt = p.completedAt || null;
      stmtProj.run([Number(p.id), String(p.name), String(p.type), String(p.stage), String(p.createdAt), startedAt, completedAt, Number(p.targetDays), Number(devId)]);
    });
    stmtProj.free();
    if (snapshot.targetAllCompletionDate) {
      const stmtSet = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      stmtSet.run(['target_all_completion_date', String(snapshot.targetAllCompletionDate)]);
      stmtSet.free();
    }
    if (snapshot.stageWipLimits && Object.keys(snapshot.stageWipLimits).length) {
      const stmtSet2 = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      stmtSet2.run(['stage_wip_limits', JSON.stringify(snapshot.stageWipLimits)]);
      stmtSet2.free();
    }
    db.exec('COMMIT;');
    await pushRemoteDB();
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
}

export async function importSQLScript(sqlText){
  if (!db) await initDB();
  try {
    db.exec(sqlText);
    await pushRemoteDB();
  } catch (e) {
    throw e;
  }
}

export async function resetDB(){
  if (!db) await initDB();
  db.exec('DELETE FROM projects; DELETE FROM devs; DELETE FROM settings;');
  await pushRemoteDB();
}

// --- Auth API on top of SQLite ---
export async function getUserCount(){
  if (!db) await initDB();
  const res = db.exec('SELECT COUNT(*) as c FROM users');
  if (res[0] && res[0].values[0]) return Number(res[0].values[0][0]);
  return 0;
}

export async function createUser(username, password, iterations = 100000){
  if (!db) await initDB();
  const u = String(username || '').trim();
  if (!u || !password) throw new Error('Username and password required');
  const exists = db.exec(`SELECT 1 FROM users WHERE username = $u LIMIT 1`, { $u: u });
  if (exists[0]) throw new Error('User already exists');
  const salt = randomBytes(16);
  const hashBytes = await pbkdf2Hash(password, salt, iterations);
  const saltB64 = bytesToBase64(salt);
  const hashB64 = bytesToBase64(hashBytes);
  const now = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO users (username, password_hash, salt, iterations, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run([u, hashB64, saltB64, iterations, now]);
  stmt.free();
  await pushRemoteDB();
  return true;
}

export async function verifyLogin(username, password){
  if (!db) await initDB();
  const u = String(username || '').trim();
  if (!u || !password) return false;
  const res = db.exec(`SELECT username, password_hash, salt, iterations FROM users WHERE username = $u LIMIT 1`, { $u: u });
  if (!res[0] || !res[0].values[0]) return false;
  const row = res[0].values[0];
  const storedHash = String(row[1]);
  const saltB64 = String(row[2]);
  const iter = Number(row[3]) || 100000;
  try {
    const saltBytes = b64ToBytes(saltB64);
    const hashBytes = await pbkdf2Hash(password, saltBytes, iter);
    const calcB64 = bytesToBase64(hashBytes);
    return calcB64 === storedHash;
  } catch {
    return false;
  }
}

// Load a remote SQLite database file (arraybuffer)
export async function loadRemoteDB(url){
  if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
  console.log('[loadRemoteDB] fetching remote DB', { url });

  const tryFetch = async (u) => {
    const res = await fetch(u, { cache: 'no-store' });
    const ct = res.headers?.get?.('content-type') || 'unknown';
    const ab = res.ok ? await res.arrayBuffer() : null;
    const len = ab ? ab.byteLength : 0;
    return { res, ct, ab, len };
  };

  const addDownloadParam = (u) => {
    try {
      const hx = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      if (!hx.searchParams.has('download')) hx.searchParams.set('download', '1');
      return hx.toString();
    } catch { return u + (u.includes('?') ? '&' : '?') + 'download=1'; }
  };

  let first = await tryFetch(url);
  let attempt = 1;

  // If first fetch has unexpected type or is empty, try again with ?download=1
  if (first.res?.ok && (/text\/html|application\/json/i.test(first.ct) || first.len === 0)) {
    const alt = addDownloadParam(url);
    console.warn('[loadRemoteDB] unexpected response; retrying with download=1', { contentType: first.ct, len: first.len, alt });
    const second = await tryFetch(alt);
    if (second.res?.ok && second.len > 0) first = second; // use the better result
    attempt = 2;
  }

  if (!first.res?.ok) {
    console.warn('[loadRemoteDB] fetch failed', { status: first.res?.status, statusText: first.res?.statusText, contentType: first.ct });
    throw new Error(`Failed to load database from ${url} (status ${first.res?.status||'n/a'})`);
  }
  if (!first.len) {
    console.warn('[loadRemoteDB] remote bytes empty after attempts', { attempts: attempt, contentType: first.ct });
    throw new Error('Remote database file was empty');
  }

  const bytes = new Uint8Array(first.ab);
  try { if (db && typeof db.close === 'function') db.close(); } catch {}
  db = new SQL.Database(bytes);
  console.log('[loadRemoteDB] remote DB instantiated', { size: bytes.length, attempts: attempt, contentType: first.ct });
  return db;
}

// Remote write (PUT)
export function getDBBytes(){ if (!db) throw new Error('DB not initialized'); return db.export(); }
export async function pushRemoteDB(url){
  const target = url || import.meta?.env?.VITE_SQLITE_PUT_URL || '/api/db/update';
  const bytes = getDBBytes();
  const headers = { 'Content-Type': 'application/octet-stream' };
  const rawToken = import.meta?.env?.VITE_DB_WRITE_TOKEN || import.meta?.env?.VITE_BLOB_READ_WRITE_TOKEN || '';
  const debug = import.meta?.env?.VITE_DEBUG_DB === '1';
  let normalizedToken = rawToken;
  if (rawToken) normalizedToken = /^Bearer\s+/i.test(rawToken) ? rawToken.replace(/^Bearer\s+/i,'').trim() : rawToken.trim();
  if (rawToken) headers.Authorization = `Bearer ${normalizedToken}`;
  if (debug) console.log('[pushRemoteDB] start', { target, tokenPresent: !!rawToken, authHeader: headers.Authorization?.slice(0,30)+'…', bytes: bytes.length });
  const t0 = performance.now();
  const res = await fetch(target, { method: 'PUT', headers, body: bytes });
  const dt = +(performance.now() - t0).toFixed(1);
  let txt = ''; try { txt = await res.text(); } catch {}
  if (!res.ok) {
    if (debug) console.log('[pushRemoteDB] failure detail', { status: res.status, elapsedMs: dt, bodyPreview: txt.slice(0,200) });
    else console.warn('[pushRemoteDB] failed', { status: res.status, target });
  } else if (debug) {
    let parsed; try { parsed = JSON.parse(txt); } catch {}
    console.log('[pushRemoteDB] success', { status: res.status, elapsedMs: dt, response: parsed||txt.slice(0,120) });
  }
  return { ok: res.ok, status: res.status };
}
