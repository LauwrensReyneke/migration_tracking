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

export default async function handler(req,res){
  const method = req.method.toUpperCase();
  const wantDebug = dbg(req.url);
  const relayKey = (process.env.RELAY_WRITE_KEY||'').trim();
  const blobName = 'migration_tracking.sqlite';

  if (method === 'GET') {
    let exists=false,size=0,url=null; try { const meta=await head(blobName); if (meta){ exists=true; size=meta.size||0; url=meta.url||null; } } catch {}
    const out = { ok:true, relay:true, blob:{ name: blobName, exists, size, url }, protected: !!relayKey };
    if (wantDebug) out.debug = { relayKeyPresent: !!relayKey, relayKeyRedacted: redact(relayKey) };
    res.status(200).json(out); return;
  }
  if (method !== 'PUT') { res.status(405).json({ error:'Method Not Allowed' }); return; }

  if (relayKey){
    const provided = (req.headers['x-relay-key']||'').toString().trim();
    if (provided !== relayKey){
      res.status(401).json({ error:'Unauthorized relay', debug: wantDebug?{ providedRedacted: redact(provided), expectedRedacted: redact(relayKey)}:undefined });
      return;
    }
  }

  try {
    const chunks=[]; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));
    const body = Buffer.concat(chunks);
    if (!body.length){ res.status(400).json({ error:'Empty body' }); return; }
    if (wantDebug) console.log('[relay] writing blob', { size: body.length });
    const stored = await put(blobName, body, { access:'public', addRandomSuffix:false, contentType:'application/octet-stream' });
    const resp = { ok:true, bytes: body.length, url: stored.url, relay:true };
    if (wantDebug) resp.debug = { storedUrl: stored.url, size: body.length };
    res.status(200).json(resp);
  } catch (e){ res.status(500).json({ error: e?.message||String(e) }); }
}

