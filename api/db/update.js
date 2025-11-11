// Simplified Vercel Blob upload endpoint for the SQLite database.
// Environment:
//   DB_WRITE_TOKEN  (required for PUT; if absent, writes are blocked)
//   BLOB_READ_WRITE_TOKEN (optional alternative token if DB_WRITE_TOKEN not set)
// Usage (client):
//   Set VITE_SQLITE_PUT_URL = '/api/db/update'
//   Set VITE_DB_WRITE_TOKEN (exposed only if you intentionally allow client writes)
//   Set VITE_SQLITE_URL to the public blob URL returned from first upload, e.g.
//     https://<your-app>.public.blob.vercel-storage.com/migration_tracking.sqlite
// Reading: client fetches VITE_SQLITE_URL directly (public). Uploads go to this endpoint.
//
// This replaces earlier, more complex multi-token logic.
import { put, head } from '@vercel/blob';

function dbgEnabled(url){
  try { const u = new URL(url, 'http://localhost'); if (u.searchParams.get('debug') === '1') return true; } catch {}
  return process.env.DEBUG_VERBOSE_DB_UPDATE === '1';
}
function redact(tok){ if(!tok) return ''; return tok.slice(0,6)+`…(${tok.length})`; }

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const rawDb = (process.env.DB_WRITE_TOKEN || '').toString();
  const rawBlob = (process.env.BLOB_READ_WRITE_TOKEN || '').toString();
  const normalize = (s) => {
    const step0 = (s || '').toString();
    const step1 = step0.trim();
    const step2 = step1.replace(/^['"]|['"]$/g, '');
    const step3 = /^Bearer\s+/i.test(step2) ? step2.replace(/^Bearer\s+/i, '') : step2;
    return step3.trim();
  };
  const candidatesRaw = [rawDb, rawBlob].filter(Boolean);
  const candidates = candidatesRaw.map(normalize).filter(Boolean);
  const blobName = 'migration_tracking.sqlite';
  const debug = dbgEnabled(req.url);
  let dryRun = false;
  try { const u = new URL(req.url, 'http://localhost'); dryRun = u.searchParams.get('dry') === '1'; } catch {}

  if (debug) {
    console.log('[db/update] init', {
      method,
      candidateCount: candidates.length,
      tokens: candidatesRaw.map(t=>redact(t)),
      normalized: candidates.map(t=>redact(t)),
      dryRun
    });
  }

  if (method === 'GET') {
    let exists = false; let size = 0; let url = null;
    try { const meta = await head(blobName); if (meta) { exists = true; size = meta.size || 0; url = meta.url || null; } } catch {}
    const payload = { ok: true, blob: { name: blobName, exists, size, url }, writeProtected: candidates.length > 0 };
    if (debug) payload.debug = { candidateCount: candidates.length, tokens: candidates.map(t=>redact(t)) };
    res.status(200).json(payload);
    return;
  }

  if (method !== 'PUT') { res.status(405).json({ error: 'Method Not Allowed' }); return; }

  if (candidates.length === 0) { res.status(403).json({ error: 'Writes disabled: set DB_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN' }); return; }

  const rawHeader = (req.headers['authorization'] || '').toString();
  const presented = normalize(rawHeader);
  const okAuth = candidates.some(tok => tok && tok === presented);

  if (debug) {
    console.log('[db/update] auth check', {
      headerRawPrefix: rawHeader.slice(0,30),
      presentedRedacted: redact(presented),
      match: okAuth,
      candidateRedacted: candidates.map(c=>redact(c))
    });
  }

  if (!okAuth) {
    const resp = { error: 'Unauthorized' };
    if (debug) resp.debug = { headerRawPrefix: rawHeader.slice(0,30), presented: redact(presented), candidates: candidates.map(c=>redact(c)) };
    res.status(401).json(resp);
    return; }

  if (dryRun) {
    const resp = { ok: true, dryRun: true };
    if (debug) resp.debug = { presented: redact(presented), candidateRedacted: candidates.map(c=>redact(c)) };
    res.status(200).json(resp);
    return;
  }

  try {
    const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    if (!body.length) { res.status(400).json({ error: 'Empty body' }); return; }
    if (debug) console.log('[db/update] writing blob', { bytes: body.length });
    const stored = await put(blobName, body, { access: 'public', addRandomSuffix: false, contentType: 'application/octet-stream' });
    const out = { ok: true, bytes: body.length, url: stored.url };
    if (debug) out.debug = { storedUrl: stored.url, size: body.length };
    res.status(200).json(out);
  } catch (e) {
    if (debug) console.log('[db/update] error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
}
