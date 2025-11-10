// Minimal server-side sql.js DB with optional filesystem persistence in /tmp on Vercel
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const IS_VERCEL = !!process.env.VERCEL;
let DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
catch { try { DATA_DIR = '/tmp'; if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }
const DB_PATH = path.join(DATA_DIR, 'mt.sqlite');

let SQL; let db;

function locateFile(file){
  try { return require.resolve('sql.js/dist/' + file); }
  catch {
    const candidates = [
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
      path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules', 'sql.js', 'dist', file)
    ];
    for (const c of candidates){ if (fs.existsSync(c)) return c; }
    return 'sql-wasm.wasm';
  }
}

function run(sql){ db.exec(sql); }
function prepare(sql){ return db.prepare(sql); }

function persist(){
  try { const data = db.export(); fs.writeFileSync(DB_PATH, Buffer.from(data)); }
  catch (e){ if (!IS_VERCEL) console.warn('[db] persist failed', e.message); }
}

function initSchema(){
  run(`PRAGMA foreign_keys = ON;`);
  run(`CREATE TABLE IF NOT EXISTS devs (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, wip_limit INTEGER);`);
  run(`CREATE TABLE IF NOT EXISTS projects (
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
  );`);
  run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`);
}

export async function init(){
  if (db) return db;
  SQL = await initSqlJs({ locateFile });
  if (fs.existsSync(DB_PATH)) {
    try { const buf = fs.readFileSync(DB_PATH); db = new SQL.Database(buf); }
    catch { db = new SQL.Database(); }
  } else { db = new SQL.Database(); }
  initSchema();
  return db;
}

export function getSnapshot(){
  const out = { developers: [], wipLimits: {}, stageWipLimits: {}, projects: [], targetAllCompletionDate: null };
  const devsRes = db.exec('SELECT id, name, wip_limit FROM devs ORDER BY id ASC');
  if (devsRes[0]){
    const rows = devsRes[0].values;
    out.developers = rows.map(r => r[1]);
    rows.forEach(r => { if (r[2] !== null && r[2] !== undefined) out.wipLimits[r[1]] = Number(r[2]); });
  }
  const mapDev = new Map();
  if (devsRes[0]) devsRes[0].values.forEach(r => mapDev.set(r[0], r[1]));
  const projRes = db.exec('SELECT id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id FROM projects ORDER BY id ASC');
  if (projRes[0]){
    const rows = projRes[0].values;
    out.projects = rows.map(r => ({ id: Number(r[0]), name: r[1], type: r[2], stage: r[3], createdAt: r[4], startedAt: r[5], completedAt: r[6], targetDays: Number(r[7]), assignedDev: mapDev.get(r[8]) || 'Unknown' }));
  }
  const setDate = db.exec("SELECT value FROM settings WHERE key='target_all_completion_date' LIMIT 1");
  if (setDate[0] && setDate[0].values[0]) out.targetAllCompletionDate = String(setDate[0].values[0][0]);
  const setStageWip = db.exec("SELECT value FROM settings WHERE key='stage_wip_limits' LIMIT 1");
  if (setStageWip[0] && setStageWip[0].values[0]) { try { out.stageWipLimits = JSON.parse(String(setStageWip[0].values[0][0])) || {}; } catch {} }
  return out;
}

export function writeSnapshot(snap){
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM projects; DELETE FROM devs; DELETE FROM settings;');
    const devIds = new Map();
    const stmtDev = prepare('INSERT INTO devs (id, name, wip_limit) VALUES (?, ?, ?)');
    (snap.developers||[]).forEach((name, idx) => {
      const id = idx + 1; devIds.set(name, id);
      stmtDev.run([id, name, Object.prototype.hasOwnProperty.call(snap.wipLimits||{}, name) ? Number(snap.wipLimits[name]) : null]);
    });
    stmtDev.free();
    const stmtProj = prepare('INSERT INTO projects (id,name,type,stage,created_at,started_at,completed_at,target_days,assigned_dev_id) VALUES (?,?,?,?,?,?,?,?,?)');
    (snap.projects||[]).forEach(p => {
      const devId = devIds.get(p.assignedDev);
      const startedAt = p.startedAt || null; const completedAt = p.completedAt || null;
      stmtProj.run([Number(p.id), String(p.name), String(p.type), String(p.stage), String(p.createdAt), startedAt, completedAt, Number(p.targetDays), Number(devId)]);
    });
    stmtProj.free();
    if (snap.targetAllCompletionDate) { const stmtSet = prepare('INSERT INTO settings (key, value) VALUES (?, ?)'); stmtSet.run(['target_all_completion_date', String(snap.targetAllCompletionDate)]); stmtSet.free(); }
    if (snap.stageWipLimits && Object.keys(snap.stageWipLimits).length) { const stmtSet2 = prepare('INSERT INTO settings (key, value) VALUES (?, ?)'); stmtSet2.run(['stage_wip_limits', JSON.stringify(snap.stageWipLimits)]); stmtSet2.free(); }
    db.exec('COMMIT');
    persist();
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function exportBytes(){ return db.export(); }
export function importBytes(bytes){ try { if (db) db.close?.(); } catch {} db = new SQL.Database(bytes); initSchema(); persist(); }

export const paths = { DB_PATH };

