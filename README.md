# Migration Tracking Dashboard

Simplified SQLite + Vercel Blob setup (single endpoint, no Express API layer).

## Overview
The app keeps a sqlite database (sql.js) in-memory on the client. Persistence uses a single public blob object: `migration_tracking.sqlite` stored in Vercel Blob Storage **in production**. In **local development** it now uses `localStorage` for persistence (no remote calls) unless explicitly forced.

Reads (client init):
- Production: fetch remote blob via `/api/db` (or `VITE_SQLITE_URL` override) and hydrate local sql.js DB.
- Local dev: load DB from `localStorage` key `mt_sqlite_db_b64`. If absent, create empty DB and seed if `seed.sql` available.

Writes (snapshot changes, user creation, script import):
- Production: `pushRemoteDB()` PUTs the binary to `/api/db` (serverless function writes blob using server token).
- Local dev: writes only update `localStorage`; remote PUTs are skipped for speed & isolation.

## Environment Variables
Set these in Vercel (production):

- Server env: `BLOB_READ_WRITE_TOKEN` (Vercel Blob token; required for writes in `/api/db`).
- Optional client env: `VITE_SQLITE_URL` (public blob URL if you want to hardcode fetch-from-blob; else client GETs `/api/db`).
- Optional local testing override: `VITE_FORCE_REMOTE_DB=1` (forces remote DB usage + writes even on localhost).
- Optional future (not yet implemented): `VITE_REQUIRE_LOGIN=1` if you wish to re-enable auth locally (currently auth is bypassed in local dev).

Deprecated / Removed (do not use):
- `VITE_SQLITE_PUT_URL`, `VITE_DB_WRITE_TOKEN`, `DB_WRITE_TOKEN`, `VITE_BLOB_READ_WRITE_TOKEN`, and any custom relay/update endpoints.

## Production vs Local Dev Behavior Summary
| Feature | Production | Local Dev (default) |
|---------|-----------|---------------------|
| DB persistence | Vercel Blob via `/api/db` | `localStorage` (`mt_sqlite_db_b64`) |
| Auth/login | Required (users table) | Auto-login as `dev` (bypassed) |
| Export JSON/SQL | Download files | Same |
| Import (file) | Replaces DB (writes blob) | Replaces local stored DB |
| Paste JSON (header & export menu) | Hidden | Visible (modal to paste snapshot) |
| Reset DB | Clears remote blob via PUT | Clears localStorage DB |
| Force remote usage locally | `VITE_FORCE_REMOTE_DB=1` | n/a |

## First-Time Blob Initialization (Production)
1. Deploy. App loads remote DB via `/api/db`; if missing, starts empty.
2. Perform first write (e.g., create admin user or add project) – this generates the blob.
3. Optionally GET `/api/db?debug=1` to verify bytes (check `X-Debug-Bytes` header).

## Local Development
Install and run:
```bash
npm install
npm run dev
```
Local dev specifics:
- Auto-login: An in-memory auth bypass sets `loggedIn=true` as user `dev`.
- DB: Stored entirely in localStorage; clear with `localStorage.removeItem('mt_sqlite_db_b64')` in DevTools.
- Paste JSON button: Available in Dashboard header + Export menu to quickly populate data.
- Last pasted JSON retained at `mt_last_paste_json_snapshot`.
- To test remote integration locally, run with `VITE_FORCE_REMOTE_DB=1`.

## Paste JSON Workflow (Local Dev)
1. Click "Paste JSON" button (header) or via Export menu.
2. Paste exported snapshot JSON (must include `developers[]` and `projects[]`).
3. Apply → DB snapshot replaced, page reloads.
4. Use "Last" to reload previous pasted content quickly.

## Security Notes (Production)
- Client holds no write tokens. All blob writes occur server-side using `BLOB_READ_WRITE_TOKEN`.
- Local dev bypasses auth for convenience; production enforces user creation/login.
- Add `VITE_FORCE_REMOTE_DB` locally only if needed for integration tests.

## Relevant Files
- `src/utils/sqlite.js`: DB init, local dev detection, remote load/push logic.
- `src/stores/auth.js`: Auth store with local dev bypass.
- `src/router/index.js`: Route guard; skips login locally.
- `src/components/LocalPasteImport.vue`: Header paste JSON modal (local only).
- `src/components/ExportMenu.vue`: Export/import and local paste option.
- `api/db/index.js`: Serverless blob GET/PUT.

## Manual Testing (Production)
After a write:
1. Check console for `[pushRemoteDB] success`.
2. GET `/api/db?debug=1` – verify `200` and non-zero bytes.
3. Download JSON/SQL export and confirm expected schema.

## Data Shape (Snapshot JSON)
```jsonc
{
  "version": 1,
  "exportedAt": "2025-11-20T12:00:00.000Z",
  "targetAllCompletionDate": "2025-12-15",
  "developers": ["Angeliki", "Bongi"],
  "wipLimits": { "Angeliki": 3 },
  "stageWipLimits": { "planning": 10 },
  "projects": [
    {
      "id": 1,
      "name": "Migration #1",
      "type": "migration",
      "stage": "planning",
      "createdAt": "2025-11-01T10:00:00.000Z",
      "startedAt": null,
      "completedAt": null,
      "targetDays": 4,
      "assignedDev": "Angeliki"
    }
  ]
}
```

## Production Readiness Notes
- Local-only features gated by `isLocalDev()`; no unintended exposure in production builds.
- Auth bypass strictly limited to hostnames `localhost`, `127.0.0.1`, `0.0.0.0` or Vite DEV flag.
- Remote override flag (`VITE_FORCE_REMOTE_DB`) ensures test flexibility without changing code.
- Paste import validation includes shape checks to avoid corrupt DB states.
- Error handling: remote load gracefully falls back to empty DB if fetch fails.
- Foreign keys enabled via `PRAGMA foreign_keys = ON;`.

## Optional Future Enhancements
- Implement "merge" mode for pasted JSON.
- Add snapshot schema version migrations.
- Include checksum verification for remote blob integrity.
- Provide automated unit tests (none configured currently) and linting.
- Add `VITE_REQUIRE_LOGIN` toggle for stricter local testing.

## Scripts
```bash
npm run dev      # Local dev (auto-login + localStorage DB)
npm run build    # Production build
npm run preview  # Preview production build locally
```

## License
Internal/tooling – no external distribution license specified.
