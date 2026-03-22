# Media Service Project Information (`INFO.md`)

## 1) What this project is

This is a **Cloudflare Worker-based media backend** for upload, listing, deletion, and global serving of files (images, videos, documents), with:

- **Cloudflare Workers** (API + CDN route logic)
- **R2** (file/object storage)
- **D1** (metadata + rate-limit counters)
- **KV** (gallery cache)
- **Hono + TypeScript** (application framework/runtime typing)

Live worker base:

- `https://cdn.aadityahasabnis.workers.dev`
- CDN serving route base: `https://cdn.aadityahasabnis.workers.dev/cdn`

---

## 2) Tech stack and key project files

### Runtime + dependencies

- `hono`
- `zod` (types/schemas available; some routes also do manual validation)
- `wrangler` + Cloudflare bindings
- TypeScript strict config

### Important source files

- `src/index.ts` - main app, middleware, routes
- `src/endpoints/upload.ts` - upload API
- `src/endpoints/listMedia.ts` - list/filter API
- `src/endpoints/deleteMedia.ts` - delete APIs
- `src/services/r2.ts` - R2 operations
- `src/services/database.ts` - D1 queries
- `src/services/cache.ts` - KV versioned cache strategy
- `src/middleware/auth.ts` - API key auth + rate limiting
- `src/ui/testUI.ts` - in-worker admin/test UI
- `schema.sql` - D1 schema (`media`, `rate_limits`)
- `wrangler.jsonc` - bindings + env vars

---

## 3) Config and resources used

From `wrangler.jsonc`:

- `MEDIA_BUCKET` -> R2 bucket: `media-storage`
- `DB` -> D1 database: `media-db`
- `MEDIA_CACHE` -> KV namespace
- Vars:
  - `CDN_BASE_URL=https://cdn.aadityahasabnis.workers.dev/cdn`
  - `MAX_UPLOAD_BYTES=104857600` (100 MB)
  - `RATE_LIMIT_PER_MIN=30`
  - `ENVIRONMENT=production`
- Secret required:
  - `ADMIN_API_KEY` (set via `wrangler secret put ADMIN_API_KEY`)

---

## 4) APIs available in this project

### Public (no API key)

- `GET /health`
- `GET /api` (API info)
- `GET /api/media/list?type=&folder=&page=&limit=`
- `GET /api/media/stats`
- `GET /api/media/folders`
- `GET /cdn/*` (serve file from R2 globally)

### Protected (requires `x-api-key` or `Authorization: Bearer`)

- `POST /api/media/upload` (multipart form-data, field `file`)
- `DELETE /api/media/delete` (JSON body `{ "file_key": "..." }`)
- `DELETE /api/media/:id`
- `POST /api/media/cache/clear`

---

## 5) How upload + global serving works

### Upload flow

1. Call `POST /api/media/upload` with API key and `multipart/form-data`.
2. Worker validates file type/size/folder/tags.
3. File is stored in R2 with generated key pattern:
   - `images|videos|files/<folder>/<timestamp>-<random>-<sanitized-name>`
4. Metadata stored in D1 table `media`.
5. Public URL returned using `CDN_BASE_URL + /<file_key>`.
6. KV cache version increments (fast invalidation).

### Serving flow

- Browser/app loads returned `public_url`, e.g.:
  - `https://cdn.aadityahasabnis.workers.dev/cdn/images/blog/....png`
- Worker route `/cdn/*` fetches object from R2 and returns:
  - content metadata
  - long cache headers (`public, max-age=31536000, immutable`)
- Result is delivered globally via Cloudflare edge.

---

## 6) Exactly how to use your worker URL for upload

Use **API route** for upload (not `/cdn`):

```bash
curl -X POST "https://cdn.aadityahasabnis.workers.dev/api/media/upload" ^
  -H "x-api-key: YOUR_ADMIN_API_KEY" ^
  -F "file=@C:\path\to\image.jpg" ^
  -F "folder=gallery" ^
  -F "tags=portfolio,homepage"
```

Expected response includes:

- `file_key`
- `public_url` -> this is your globally-usable file URL

Then use `public_url` directly in your app (`<img src=...>`, `<video src=...>`).

---

## 7) Cloudinary-like integration in your other project (recommended)

You can use this as your own Cloudinary-style media layer.

### Recommended architecture

1. **Your app backend** handles upload requests from your app UI.
2. Backend forwards file to this worker (`/api/media/upload`) using `ADMIN_API_KEY` securely.
3. Backend stores returned `public_url` + `file_key` in your app DB.
4. Frontend gallery renders `public_url`.
5. On delete, backend calls `/api/media/delete` with `file_key`.

### Why backend proxy is recommended

- `ADMIN_API_KEY` is privileged.
- Do **not** expose it in public frontend code.
- Keep secrets server-side (API route/server action/function).

### Minimal integration checklist

- Add env vars to your app:
  - `MEDIA_SERVICE_BASE_URL=https://cdn.aadityahasabnis.workers.dev`
  - `MEDIA_SERVICE_API_KEY=...`
- Create two backend helpers:
  - `uploadToMediaService(file, folder, tags?)`
  - `deleteFromMediaService(fileKey)`
- Persist `public_url` and `file_key` in your own gallery/media table.

---

## 8) Existing docs in this repo (and where to start)

Main docs folder: `.docs\`

Recommended reading order:

1. `.docs\SETUP.md` - setup + first-run flow
2. `.docs\API_USAGE.md` - API examples/integration
3. `.docs\QUICK_REFERENCE.md` - quick commands/endpoints
4. `.docs\ENV.md` - env vars + bindings
5. `.docs\TROUBLESHOOTING.md` - common problems/fixes
6. `.docs\ARCHITECTURE.md` - architecture notes

Also relevant:

- `README.md` (project overview)
- `KV_LIMIT_FIX.md` (why versioned KV cache is used)
- `.docs\claudinary-like.md` (conceptual Cloudinary-like design notes)

---

## 9) Notes about behavior/limits

- Max upload size currently: **100 MB** (`MAX_UPLOAD_BYTES`)
- Rate limit currently: **30 req/min/IP** (`RATE_LIMIT_PER_MIN`)
- Allowed MIME types are whitelisted in `src/utils/validation.ts`
- CORS is enabled (`origin: *`)
- List responses are cached in KV (version-based invalidation)

---

## 10) Practical next step for your use case

If your goal is “my own globally-served gallery”:

1. Keep using this worker as media service.
2. Integrate only through your other project backend.
3. Store `public_url` + `file_key` in your own DB records.
4. Render `public_url` in your custom gallery UI.
5. Use worker delete API when a gallery item is removed.

This gives you a Cloudinary-like workflow with your own infra and URLs.
