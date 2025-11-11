# Migration Tracking Dashboard

Simplified SQLite + Vercel Blob setup.

## Overview
The app keeps a sqlite database (sql.js) in-memory both client-side (for offline/quick interactions) and server-side (Express in serverless). Persistence now has a single public blob object: `migration_tracking.sqlite` stored in Vercel Blob Storage.

Reads (client init):
- Client fetches the public blob URL (VITE_SQLITE_URL) OR falls back to `/api/db` (raw bytes served by server) if not set.

Writes (snapshot changes, user creation, script import):
- Client code calls `pushRemoteDB()` which PUTs the binary to `/api/db/update` with a Bearer token.
- On Vercel, `/api/db/update` is the dedicated serverless function in `api/db/update.js` that writes to Blob Storage.
- In local dev, the same path is served by Express (`sharedApi.js`) and simply swaps the in-memory server DB.

## Environment Variables
Set these in Vercel (and optionally a local `.env` file for dev):

- `DB_WRITE_TOKEN`: Required for write operations. Chosen secret string. (If absent, PUT is disabled in production.)
- `VITE_DB_WRITE_TOKEN`: Only expose this to the client if you intentionally allow client-origin writes. Otherwise omit and perform writes server-side only.
- `VITE_SQLITE_PUT_URL` (optional): Default is `/api/db/update` so you can skip setting it.
- `VITE_SQLITE_URL`: Public blob URL after first successful upload. Example: `https://<your-project>.public.blob.vercel-storage.com/migration_tracking.sqlite`.

Optional legacy values (no longer needed):
- `VITE_SQLITE_PUT_METHOD`, `VITE_SQLITE_PUT_HEADERS`, `VITE_SQLITE_PUT_AUTH`, `VITE_BLOB_READ_WRITE_TOKEN`.

## First-Time Blob Initialization
1. Deploy without `VITE_SQLITE_URL` so the app loads the local server copy or empty DB.
2. Perform operations that trigger a write (e.g. create first user or project) to upload the DB via `/api/db/update`.
3. Call GET `/api/db/update` (or inspect function log output) to retrieve the returned `url` of the stored blob.
4. Set that value as `VITE_SQLITE_URL` in Vercel and redeploy. Clients will now fetch directly from Blob on init.

## Local Development
You can run:
```bash
npm install
npm run dev
```
Set `DB_WRITE_TOKEN` and `VITE_DB_WRITE_TOKEN` in a `.env` (create one) if you want client writes locally:
```
DB_WRITE_TOKEN=devtoken123
VITE_DB_WRITE_TOKEN=devtoken123
```
(With Vite you may need to restart after adding env vars.)

## Security Notes
- Do NOT expose `VITE_DB_WRITE_TOKEN` publicly if you want to restrict writes—perform writes through server endpoints instead.
- All writes require the correct Bearer token; absence results in 403/401 responses.

## Relevant Files
- `src/utils/sqlite.js`: Simplified remote load + push.
- `api/db/update.js`: Blob upload endpoint (production). GET returns metadata, PUT stores blob.
- `sharedApi.js`: Local Express routes (download + local PUT for development).

## Migration From Old Setup
Remove any references to removed env vars in dashboard deployment configs. Only keep the minimal ones listed above.

## Manual Testing
After a change causing a DB write (e.g., creating a user):
1. Check client console for `[pushRemoteDB]` logs.
2. Hit GET `/api/db/update` to confirm `exists: true` and review `size`.
3. Download from `VITE_SQLITE_URL` and inspect with `sqlite3` or `sql.js`.

## Next Improvements (Optional)
- Add integrity hash header on upload/download for extra validation.
- Implement incremental change logging rather than full DB write each time.
- Introduce role-based auth with JWT for finer-grained permissions.

