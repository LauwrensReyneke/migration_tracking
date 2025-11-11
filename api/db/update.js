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

export default function handler(_req,res){
  res.status(410).json({ error: 'Deprecated', message: 'Use /api/db for GET (download) and PUT (upload). No client auth needed; server uses BLOB_READ_WRITE_TOKEN.' });
}
