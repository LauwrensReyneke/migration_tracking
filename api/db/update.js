// Vercel Serverless (Edge) endpoint to receive the updated SQLite binary
// and write it to Vercel Blob Storage.
// Usage:
//  - Set env var DB_WRITE_TOKEN to a secret value.
//  - Frontend sets VITE_SQLITE_PUT_URL = "/api/db/update"
//  - Frontend sets VITE_SQLITE_PUT_METHOD = "PUT"
//  - Frontend sets VITE_SQLITE_PUT_HEADERS = '{"Authorization":"Bearer YOUR_TOKEN"}'
//  - pushRemoteDB will send the binary; this endpoint stores it as migration_tracking.sqlite (public)

import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default async function handler(req) {
  if (req.method !== 'PUT') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  // Simple auth check
  const auth = req.headers.get('authorization');
  const expected = process.env.DB_WRITE_TOKEN ? `Bearer ${process.env.DB_WRITE_TOKEN}` : null;
  if (expected && auth !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const data = await req.arrayBuffer();
    if (!data || data.byteLength === 0) {
      return json({ error: 'Empty body' }, 400);
    }

    // Write to blob (overwrites existing because addRandomSuffix: false)
    await put('migration_tracking.sqlite', data, {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/octet-stream'
    });

    return json({ ok: true, bytes: data.byteLength });
  } catch (e) {
    return json({ error: e?.message || String(e) }, 500);
  }
}

