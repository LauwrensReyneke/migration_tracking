import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let SQL = null;
let db = null;
let initPromise = null;

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

// Local dev persistence helpers (localStorage)
const LS_KEY = 'mt_sqlite_db_b64';
export function isLocalDev(){
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const devFlag = !!import.meta?.env?.DEV; // Vite sets this
  return devFlag || /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(host);
}
function loadLocalDB(){
  return (async () => {
    if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const b64 = (typeof localStorage !== 'undefined') ? localStorage.getItem(LS_KEY) : null;
    if (b64) {
      try {
        const bytes = base64ToBytes(b64);
        db = new SQL.Database(bytes);
        console.log('[loadLocalDB] loaded DB from localStorage', { size: bytes.length });
        return db;
      } catch (e) {
        console.warn('[loadLocalDB] failed to parse stored DB, creating new', e?.message||String(e));
      }
    }
    db = new SQL.Database();
    console.log('[loadLocalDB] created new empty DB');
    persistLocalDB();
    return db;
  })();
}
function persistLocalDB(){
  if (!db) return;
  try {
    const bytes = db.export();
    const b64 = bytesToBase64(bytes);
    if (typeof localStorage !== 'undefined') localStorage.setItem(LS_KEY, b64);
    console.log('[persistLocalDB] saved DB to localStorage', { size: bytes.length });
  } catch (e) {
    console.warn('[persistLocalDB] failed', e?.message||String(e));
  }
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
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
    const runtimeEnv = (typeof window !== 'undefined' && window.__MT_ENV && window.__MT_ENV.sqliteUrl) ? window.__MT_ENV.sqliteUrl : null;
    // Allow forcing remote in local dev via VITE_FORCE_REMOTE_DB=1; otherwise always use local storage when dev.
    const forceRemote = !!import.meta?.env?.VITE_FORCE_REMOTE_DB;
    const useLocal = isLocalDev() && !forceRemote;
    if (useLocal) {
      console.log('[initDB] local dev detected; using localStorage DB');
      await loadLocalDB();
    } else {
      const remoteUrl = (runtimeEnv && String(runtimeEnv).trim()) ? String(runtimeEnv).trim() : (import.meta?.env?.VITE_SQLITE_URL || '/api/db');
      try {
        console.log('[initDB] loading remote DB', remoteUrl);
        await loadRemoteDB(remoteUrl);
        console.log('[initDB] remote load OK');
      } catch (e) {
        console.warn('[initDB] remote load failed; using empty DB', e?.message||String(e));
        db = new SQL.Database();
      }
    }
    db.exec(`PRAGMA foreign_keys = ON;`);

    // Ensure schema with nullable assigned_dev_id
    try {
      const info = db.exec(`PRAGMA table_info(projects)`);
      const cols = info[0] ? info[0].values : [];
      const colMap = new Map(cols.map(r => [String(r[1]), { notnull: Number(r[3]) }]));
      const exists = cols.length > 0;
      const needsMigration = exists && colMap.has('assigned_dev_id') && colMap.get('assigned_dev_id').notnull === 1;
      if (!exists) {
        db.exec(`
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
            assigned_dev_id INTEGER NULL,
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
      } else if (needsMigration) {
        console.log('[initDB] migrating projects table to allow NULL assigned_dev_id');
        db.exec('BEGIN;');
        db.exec(`
          CREATE TABLE projects_new (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('migration','newbuild')),
            stage TEXT NOT NULL CHECK (stage IN ('planning','template_build','review','final_updates','production','canceled')),
            created_at TEXT NOT NULL,
            started_at TEXT NULL,
            completed_at TEXT NULL,
            target_days INTEGER NOT NULL,
            assigned_dev_id INTEGER NULL,
            FOREIGN KEY (assigned_dev_id) REFERENCES devs(id) ON UPDATE CASCADE
          );
          INSERT INTO projects_new (id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id)
            SELECT id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id FROM projects;
          DROP TABLE projects;
          ALTER TABLE projects_new RENAME TO projects;
        `);
        db.exec('COMMIT;');
      }
      // Ensure other tables exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS devs (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, wip_limit INTEGER);
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
    } catch (e) {
      console.warn('[initDB] ensure schema failed', e?.message||String(e));
    }

    if (useLocal) persistLocalDB();
    return db;
  })();
  return initPromise;
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
    out.projects = rows.map(r => ({ id: Number(r[0]), name: r[1], type: r[2], stage: r[3], createdAt: r[4], startedAt: r[5], completedAt: r[6], targetDays: Number(r[7]), assignedDev: mapDev.get(r[8]) || '' }));
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
      const devId = p.assignedDev ? devIds.get(p.assignedDev) : null;
      const startedAt = p.startedAt || null;
      const completedAt = p.completedAt || null;
      stmtProj.run([Number(p.id), String(p.name), String(p.type), String(p.stage), String(p.createdAt), startedAt, completedAt, Number(p.targetDays), devId || null]);
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
    if (isLocalDev()) {
      persistLocalDB();
    }
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
    if (isLocalDev()) persistLocalDB();
    await pushRemoteDB();
  } catch (e) {
    throw e;
  }
}

export async function resetDB(){
  if (!db) await initDB();
  db.exec('DELETE FROM projects; DELETE FROM devs; DELETE FROM settings;');
  if (isLocalDev()) persistLocalDB();
  await pushRemoteDB();
}

// --- Auth API on top of SQLite ---
export async function getUserCount(){
  if (!db) await initDB();
  try {
    const res = db.exec('SELECT COUNT(*) as c FROM users');
    if (res[0] && res[0].values[0]) return Number(res[0].values[0][0]);
    return 0;
  } catch (e) {
    console.warn('[getUserCount] failed, ensuring users table then returning 0', e?.message||String(e));
    try { db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 100000,
      created_at TEXT NOT NULL
    );`); } catch {}
    return 0;
  }
}

export async function userExists(username){
  if (!db) await initDB();
  const u = String(username || '').trim();
  if (!u) return false;
  try {
    const res = db.exec(`SELECT 1 FROM users WHERE username = $u LIMIT 1`, { $u: u });
    return !!(res[0] && res[0].values && res[0].values[0]);
  } catch (e) {
    try { db.exec(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 100000,
      created_at TEXT NOT NULL
    );`); } catch {}
    return false;
  }
}

export async function listUsernames(){
  if (!db) await initDB();
  try {
    const res = db.exec('SELECT username FROM users ORDER BY username ASC');
    if (!res[0]) return [];
    return res[0].values.map(r => String(r[0]));
  } catch (e) {
    return [];
  }
}

export async function resetUsers(){
  if (!db) await initDB();
  db.exec('DELETE FROM users;');
  if (isLocalDev()) persistLocalDB();
  await pushRemoteDB();
}

export async function createUser(username, password){
  if (!db) await initDB();
  const u = String(username || '').trim();
  const p = String(password || '');
  if (!u || !p) throw new Error('Username and password required');
  // Check if exists
  const exists = db.exec(`SELECT 1 FROM users WHERE username=$u LIMIT 1`, { $u: u });
  if (exists[0] && exists[0].values[0]) throw new Error('User already exists');
  const salt = randomBytes(16);
  const iterations = 100000;
  const hashBytes = await pbkdf2Hash(p, salt, iterations, 32);
  const hashB64 = bytesToBase64(hashBytes);
  const saltB64 = bytesToBase64(salt);
  const createdAt = new Date().toISOString();
  const stmt = db.prepare('INSERT INTO users (username, password_hash, salt, iterations, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run([u, hashB64, saltB64, iterations, createdAt]);
  stmt.free();
  if (isLocalDev()) persistLocalDB();
  await pushRemoteDB();
  return true;
}

export async function verifyLogin(username, password){
  if (!db) await initDB();
  const u = String(username || '').trim();
  const p = String(password || '');
  if (!u || !p) return false;
  const res = db.exec('SELECT password_hash, salt, iterations FROM users WHERE username=$u LIMIT 1', { $u: u });
  if (!res[0] || !res[0].values[0]) return false;
  const row = res[0].values[0];
  const storedHashB64 = String(row[0] || '');
  const saltB64 = String(row[1] || '');
  const iterations = Number(row[2] || 100000);
  if (!storedHashB64 || !saltB64 || !Number.isFinite(iterations)) return false;
  const saltBytes = base64ToBytes(saltB64);
  const hashBytes = await pbkdf2Hash(p, saltBytes, iterations, 32);
  const calcHashB64 = bytesToBase64(hashBytes);
  return calcHashB64 === storedHashB64;
}

// --- Remote DB (vercel blob) ---
async function loadRemoteDB(url){
  const resp = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!resp.ok) throw new Error(`Remote DB fetch failed: ${resp.status}`);
  const buf = await resp.arrayBuffer();
  if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl });
  db = new SQL.Database(new Uint8Array(buf));
}

async function pushRemoteDB(){
  try {
    const url = (typeof window !== 'undefined' && window.__MT_ENV && window.__MT_ENV.sqliteUrl) ? window.__MT_ENV.sqliteUrl : (import.meta?.env?.VITE_SQLITE_URL || '/api/db');
    const bytes = db.export();
    await fetch(url, { method: 'PUT', body: bytes });
  } catch (e) {
    console.warn('[pushRemoteDB] failed', e?.message||String(e));
  }
}
