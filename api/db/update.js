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
  // Debug helper (GET ?debug=1) if DEBUG_ALLOW_DB_WRITE_DEBUG is set
  const url = new URL(req.url, 'http://localhost');
  const debug = url.searchParams.get('debug');
  const allowDebug = process.env.DEBUG_ALLOW_DB_WRITE_DEBUG === '1';

  if (req.method === 'GET') {
    if (debug === '1' && allowDebug) {
      const token = process.env.DB_WRITE_TOKEN || '';
      res.status(200).json({ ok: true, debug: true, tokenLength: token.length });
      return;
    }
    res.status(200).json({ ok: true, message: 'Use PUT with application/octet-stream to upload the SQLite DB', authRequired: !!process.env.DB_WRITE_TOKEN });
    return;
  }
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  // Auth check (support 'Bearer <token>' OR raw '<token>')
  const rawHeader = req.headers['authorization'] || '';
  const expectedToken = process.env.DB_WRITE_TOKEN || '';
  const bearerForm = `Bearer ${expectedToken}`;
  const okAuth = expectedToken && (rawHeader.trim() === bearerForm || rawHeader.trim() === expectedToken);

  if (!okAuth) {
    res.status(401).json({ error: 'Unauthorized', receivedSample: rawHeader ? rawHeader.split(' ').slice(0,2).join(' ') : 'none', requiredFormat: 'Authorization: Bearer <DB_WRITE_TOKEN>' });
    return;
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    if (!body.length) {
      res.status(400).json({ error: 'Empty body' });
      return;
    }

    await put('migration_tracking.sqlite', body, { access: 'public', addRandomSuffix: false, contentType: 'application/octet-stream' });
    res.status(200).json({ ok: true, bytes: body.length });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
}
