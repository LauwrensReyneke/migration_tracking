# Migration Tracking Dashboard

Simplified SQLite + Vercel Blob setup (single endpoint, no Express API layer).

## Overview
The app keeps a sqlite database (sql.js) in-memory on the client. Persistence uses a single public blob object: `migration_tracking.sqlite` stored in Vercel Blob Storage.

Reads (client init):
- If `VITE_SQLITE_URL` is set, the client fetches that public blob URL and hydrates the local sql.js DB.
- If it is not set, the client starts with an empty DB (and may seed via `seed.sql`).

Writes (snapshot changes, user creation, script import):
- Client code calls `pushRemoteDB()` which PUTs the binary to `/api/db/update` with a Bearer token.
- On Vercel, `/api/db/update` is the serverless function in `api/db/update.js` that writes to Blob Storage.
- (Local dev note) Without a local handler for `/api/db/update`, writes will 404. If you need local persistence during development, add a dev server stub or temporarily deploy.

## Environment Variables
Set these in Vercel (and optionally a local `.env` for development):

- `DB_WRITE_TOKEN` (server env): Required for production writes. Choose a secret string.
- `VITE_DB_WRITE_TOKEN` (client env): Only set if you intentionally allow client-origin writes. Omit to block client writes.
- `VITE_SQLITE_URL`: Public blob URL after first successful upload, e.g. `https://<project>.public.blob.vercel-storage.com/migration_tracking.sqlite`.

Deprecated / Removed (do not use anymore):
- `VITE_SQLITE_PUT_URL`, `VITE_SQLITE_PUT_METHOD`, `VITE_SQLITE_PUT_HEADERS`, `VITE_SQLITE_PUT_AUTH`, `VITE_BLOB_READ_WRITE_TOKEN`.

## First-Time Blob Initialization
1. Deploy without `VITE_SQLITE_URL` so the app starts empty.
2. Perform an action that triggers a write (e.g. create first user or project) – this PUTs to `/api/db/update`.
3. GET `/api/db/update` to retrieve metadata; the response includes the stored blob `url`.
4. Set that URL as `VITE_SQLITE_URL` in project settings and redeploy. Future clients load directly from Blob.

## Local Development
Install and run:
```bash
npm install
npm run dev
```
Optional `.env` if you want to test writes locally (will still 404 unless you add a stub):
```
DB_WRITE_TOKEN=devtoken123
VITE_DB_WRITE_TOKEN=devtoken123
```
To enable local persistence, implement a simple stub endpoint or run a Vercel dev environment providing the function.

## Security Notes
- Avoid exposing `VITE_DB_WRITE_TOKEN` if you want to restrict writes; perform controlled writes via a secure backend instead.
- Writes without a valid Bearer token return 401/403.

## Relevant Files
- `src/utils/sqlite.js`: Remote load (only if URL provided) + push logic.
- `api/db/update.js`: Blob upload function (production). GET returns metadata, PUT stores blob.

## Migration From Old Setup
Remove any references to deprecated env vars and deleted files (`sharedApi.js`, server-side `api/db.js`, `api/index.js`). Only keep the minimal variables listed above.

## Manual Testing
After a change triggering a DB write:
1. Check client console for `[pushRemoteDB]` logs.
2. GET `/api/db/update` – verify JSON shows `blob.exists` and `size`.
3. Download from `VITE_SQLITE_URL` and inspect with `sql.js` or `sqlite3`.

## Next Improvements (Optional)
- Add integrity hash verification (upload and compare on load).
- Implement incremental change logging to reduce blob writes.
- Introduce role-based auth/JWT for finer control over write access.
