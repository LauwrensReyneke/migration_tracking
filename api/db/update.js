// Vercel Serverless (Node.js) endpoint to receive the updated SQLite binary
// and write it to Vercel Blob Storage.
// Usage:
//  - Set env var DB_WRITE_TOKEN to a secret value.
//  - Frontend sets VITE_SQLITE_PUT_URL = "/api/db/update"
//  - Frontend sets VITE_SQLITE_PUT_METHOD = "PUT"
//  - Frontend sets VITE_SQLITE_PUT_HEADERS = '{"Authorization":"Bearer YOUR_TOKEN"}'
//  - pushRemoteDB will send the binary; this endpoint stores it as migration_tracking.sqlite (public)

import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, message: 'Use PUT with application/octet-stream to upload the SQLite DB', authRequired: !!process.env.DB_WRITE_TOKEN });
    return;
  }
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Simple auth check
  const auth = req.headers['authorization'];
  const expected = process.env.DB_WRITE_TOKEN ? `Bearer ${process.env.DB_WRITE_TOKEN}` : null;
  if (expected && auth !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Read raw binary body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const body = Buffer.concat(chunks);
    if (!body || body.length === 0) {
      res.status(400).json({ error: 'Empty body' });
      return;
    }

    await put('migration_tracking.sqlite', body, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/octet-stream'
    });

    res.status(200).json({ ok: true, bytes: body.length });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}
