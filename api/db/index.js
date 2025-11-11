// Single, simple serverless function: GET returns the current SQLite blob bytes; PUT replaces it.
// Auth: server-only BLOB_READ_WRITE_TOKEN (managed by Vercel). Client sends no credentials.
// Env:
//   BLOB_READ_WRITE_TOKEN (required)
// Blob object name: migration_tracking.sqlite (public, stable name)
import { put, head } from '@vercel/blob';

const BLOB_NAME = 'migration_tracking.sqlite';

export default async function handler(req, res){
  const method = req.method.toUpperCase();

  if (method === 'GET') {
    try {
      const meta = await head(BLOB_NAME);
      if (!meta || !meta.url) return res.status(404).json({ error: 'Blob not found' });
      const resp = await fetch(meta.url, { cache: 'no-store' });
      if (!resp.ok) return res.status(resp.status).json({ error: 'Fetch failed', status: resp.status });
      const ab = await resp.arrayBuffer();
      res.setHeader('Content-Type','application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename="migration_tracking.sqlite"');
      return res.send(Buffer.from(ab));
    } catch (e) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  if (method === 'PUT') {
    try {
      const chunks = []; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c));
      const buf = Buffer.concat(chunks);
      if (!buf.length) return res.status(400).json({ error: 'Empty body' });
      const stored = await put(BLOB_NAME, buf, { access: 'public', addRandomSuffix: false, contentType: 'application/octet-stream' });
      return res.status(200).json({ ok: true, bytes: buf.length, url: stored.url });
    } catch (e) {
      return res.status(500).json({ error: e?.message || String(e) });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
