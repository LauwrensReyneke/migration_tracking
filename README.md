# Migration Tracking Dashboard

Simplified SQLite + Vercel Blob setup (single endpoint, no Express API layer).

## Overview
The app keeps a sqlite database (sql.js) in-memory on the client. Persistence uses a single public blob object: `migration_tracking.sqlite` stored in Vercel Blob Storage.

Reads (client init):
- If `VITE_SQLITE_URL` is set, the client fetches that public blob URL and hydrates the local sql.js DB.
- If it is not set, the client starts with an empty DB (and may seed via `seed.sql`).

Writes (snapshot changes, user creation, script import):
- Client calls `pushRemoteDB()` which PUTs the binary to `/api/db` with no client auth; the serverless function writes to Vercel Blob using its server-side token.

## Environment Variables
Set these in Vercel:

- Server env: `BLOB_READ_WRITE_TOKEN` (provided by Vercel Blob; required for writes in `/api/db`).
- Optional client env: `VITE_SQLITE_URL` (public blob URL if you want to hardcode fetch-from-blob; otherwise the client GETs `/api/db`).

Deprecated / Removed (do not use):
- `VITE_SQLITE_PUT_URL`, `VITE_DB_WRITE_TOKEN`, `DB_WRITE_TOKEN`, `VITE_BLOB_READ_WRITE_TOKEN`, and any custom relay/update endpoints.

## First-Time Blob Initialization
1. Deploy. The app will load via `/api/db` GET which proxies current blob if present; if not, it starts empty.
2. Perform an action that triggers a write (e.g., create first user or project) – this PUTs to `/api/db`.
   - Note: If there are no users, both the explicit "Create Admin & Sign in" flow and a normal "Sign in" will create the first user and write the blob.
3. Optionally GET `/api/db?debug=1` to verify bytes served.

## Local Development
Install and run:
```bash
npm install
npm run dev
```
No client tokens are needed. The serverless function `/api/db` handles writes using server env.

## Security Notes
- No client-side secrets or tokens are used. All blob writes happen server-side with `BLOB_READ_WRITE_TOKEN`.

## Relevant Files
- `src/utils/sqlite.js`: Remote load and push logic (targets `/api/db`).
- `api/db/index.js`: Blob GET/PUT serverless function.

## Manual Testing
After a write:
1. Check client console for `[pushRemoteDB]` logs.
2. GET `/api/db?debug=1` – verify status 200 and X-Debug-Bytes header.

## Next Improvements (Optional)
- Add integrity hash verification (upload and compare on load).
- Implement incremental change logging to reduce blob writes.
- Introduce role-based auth/JWT for finer control over write access.
