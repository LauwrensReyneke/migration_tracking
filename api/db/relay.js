// Relay endpoint: accepts raw SQLite binary and writes to Vercel Blob using server-side token only.
// Purpose: avoid exposing DB_WRITE_TOKEN/BLOB_READ_WRITE_TOKEN to the client.
// Env:
//   RELAY_WRITE_KEY (optional) if set, require header X-Relay-Key: <key>
//   DB_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN must still exist server-side for blob write permissions
// Usage (client): set VITE_USE_RELAY=1 and call pushRemoteDB (auto-switch) without Authorization.
//                 It will PUT to /api/db/relay with application/octet-stream.
// Debug: add ?debug=1 to get redacted env info.
import { put, head } from '@vercel/blob';

function dbg(url){ try { const u = new URL(url,'http://localhost'); return u.searchParams.get('debug')==='1'; } catch { return false; } }
function redact(s){ if(!s) return ''; return String(s).slice(0,6)+'…('+String(s).length+')'; }

export default function handler(_req,res){ res.status(410).json({ error:'Deprecated', message:'Use /api/db for both GET and PUT' }); }
