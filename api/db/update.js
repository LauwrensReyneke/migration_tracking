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

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const writeToken = process.env.DB_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
  const blobName = 'migration_tracking.sqlite';

  if (method === 'GET') {
    // Provide meta info + existence check
    let exists = false; let size = 0; let url = null;
    try {
      // head() throws if not found
      const meta = await head(blobName);
      if (meta) { exists = true; size = meta.size || 0; url = meta.url || null; }
    } catch {}
    res.status(200).json({ ok: true, blob: { name: blobName, exists, size, url }, writeProtected: !!writeToken });
    return;
  }

  if (method !== 'PUT') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!writeToken) {
    res.status(403).json({ error: 'Writes disabled: set DB_WRITE_TOKEN' });
    return;
  }

  const authHeader = (req.headers['authorization'] || '').toString().trim();
  const provided = authHeader.replace(/^Bearer\s+/i, '').replace(/^['"]|['"]$/g, '');
  if (provided !== writeToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    if (!body.length) { res.status(400).json({ error: 'Empty body' }); return; }
    const stored = await put(blobName, body, { access: 'public', addRandomSuffix: false, contentType: 'application/octet-stream' });
    res.status(200).json({ ok: true, bytes: body.length, url: stored.url });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}
