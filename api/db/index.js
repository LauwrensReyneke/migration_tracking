// Single, simple serverless function: GET returns the current SQLite blob bytes; PUT replaces it.
// Auth: server-only BLOB_READ_WRITE_TOKEN (managed by Vercel). Client sends no credentials.
// Env:
//   BLOB_READ_WRITE_TOKEN (required)
// Blob object name: migration_tracking.sqlite (public, stable name)
import { put, head } from '@vercel/blob';

const BLOB_NAME = 'migration_tracking.sqlite';

// Env-driven security controls
const API_KEY = process.env.DB_API_KEY || '';
const REQUIRE_KEY = (process.env.DB_REQUIRE_KEY || (API_KEY ? '1' : '0')) === '1';
const ALLOWED_ORIGINS = (process.env.DB_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function wantDebug(req){
  try { const u = new URL(req.url, 'http://localhost'); return u.searchParams.get('debug') === '1'; } catch { return false; }
}

function pickAllowedOrigin(origin){
  if (!origin) return '';
  if (!ALLOWED_ORIGINS.length) return origin; // if none configured, reflect for convenience in dev
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
}

function setCors(req, res){
  const origin = req.headers?.origin || '';
  const allow = pickAllowedOrigin(origin);
  if (allow) res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

function unauthorized(res, msg = 'Unauthorized'){
  res.statusCode = 401;
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({ error: msg }));
}

function forbidden(res, msg = 'Forbidden'){
  res.statusCode = 403;
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({ error: msg }));
}

function ensureAuth(req, res){
  // Optional origin allow-list; if configured, block unknown origins for browser requests
  const origin = req.headers?.origin || '';
  if (ALLOWED_ORIGINS.length && origin) {
    if (!ALLOWED_ORIGINS.includes(origin)) {
      forbidden(res, 'Origin not allowed');
      return false;
    }
  }
  if (!REQUIRE_KEY) return true;
  const key = req.headers['x-api-key'] || req.headers['X-Api-Key'];
  if (!key || key !== API_KEY) {
    unauthorized(res);
    return false;
  }
  return true;
}

export default async function handler(req, res){
  const method = (req.method||'GET').toUpperCase();
  const debug = wantDebug(req);

  setCors(req, res);
  // Never cache DB responses
  res.setHeader('Cache-Control', 'no-store');

  if (method === 'OPTIONS') {
    res.statusCode = 204; // No Content
    return res.end();
  }

  if (method === 'GET') {
    if (!ensureAuth(req, res)) return; // auth gate for GET
    try {
      const meta = await head(BLOB_NAME);
      if (!meta || !meta.url) return res.status(404).json({ error: 'Blob not found' });
      const resp = await fetch(meta.url, { cache: 'no-store' });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Fetch failed', status: resp.status });
      const ab = await resp.arrayBuffer();
      res.setHeader('Content-Type','application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="migration_tracking.sqlite"');
      if (debug) res.setHeader('X-Debug-Bytes', String(ab.byteLength));
      return res.send(Buffer.from(ab));
    } catch (e) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  if (method === 'PUT') {
    if (!ensureAuth(req, res)) return; // auth gate for PUT
    try {
      const u = new URL(req.url, 'http://localhost');
      const dry = u.searchParams.get('dry') === '1';
      const chunks = []; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));
      const buf = Buffer.concat(chunks);
      if (!buf.length) return res.status(400).json({ error: 'Empty body' });
      if (dry) return res.status(200).json({ ok: true, dryRun: true, bytes: buf.length });
      const stored = await put(BLOB_NAME, buf, { access: 'private', addRandomSuffix: false, contentType: 'application/octet-stream' });
      return res.status(200).json({ ok: true, bytes: buf.length, url: stored.url });
    } catch (e) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
