# Plan: Cloudinary-Like Media Platform on Cloudflare

## TL;DR
Full-stack, professional Cloudinary-like media platform built exclusively on Cloudflare: monorepo with a Worker API backend and a React + Vite admin dashboard on Cloudflare Pages. Workers handle auth/upload/list/delete; R2 stores files; D1 stores metadata; KV caches gallery results; CDN serves files globally.

---

---

## Phase 1 — Monorepo Scaffold

1. Create root `package.json` as npm workspace: `{ "workspaces": ["api", "dashboard"] }`
2. Create `api/` directory — Cloudflare Worker (TypeScript)
3. Create `dashboard/` directory — React + Vite + TypeScript (Cloudflare Pages)
4. Root `.gitignore` covering both packages
5. Root `ARCHITECTURE.md` — full system design doc (content from spec)
6. Root `README.md` — setup guide, CLI commands, deployment steps

## Phase 2 — Cloudflare Resources (document CLI commands in README)

7. R2 bucket: `wrangler r2 bucket create media-storage`
8. D1 database: `wrangler d1 create media-db` → capture database_id for wrangler.toml
9. KV namespace: `wrangler kv:namespace create MEDIA_CACHE` → capture id for wrangler.toml
10. Write `api/schema.sql` — full `media` table DDL (id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, metadata JSON)
11. CDN custom domain `cdn.example.com` → connected to R2 bucket (manual dashboard step, documented)

## Phase 3 — API: Core Types & Utils

12. `api/src/types.ts` — shared interfaces: `MediaRecord`, `UploadResponse`, `ListResponse`, `Env` (bindings: MEDIA_BUCKET, DB, MEDIA_CACHE, ADMIN_API_KEY, CDN_BASE_URL)
13. `api/src/utils/fileName.ts` — `generateFileKey(folder, originalName)` → `{folder}/{timestamp}-{nanoid}-{sanitizedName}`
14. `api/src/utils/validation.ts` — `validateMimeType()` (allowlist), `validateFileSize()` (configurable max), `sanitizeFilename()`
15. `api/src/utils/response.ts` — typed helpers: `jsonOk()`, `jsonError()`, `corsHeaders()`

## Phase 4 — API: Services (parallel)

16. `api/src/services/r2.ts` — `uploadObject(bucket, key, body, contentType)`, `deleteObject(bucket, key)`, `getObjectUrl(cdnBase, key)`
17. `api/src/services/database.ts` — `insertMedia(db, record)`, `queryMedia(db, filters)`, `deleteMedia(db, fileKey)` — fully typed D1 SQL
18. `api/src/services/cache.ts` — `getCached(kv, key)`, `setCached(kv, key, value, ttl)`, `invalidatePattern(kv, prefix)` — KV wrapper with 300s TTL

## Phase 5 — API: Middleware & Routes (parallel)

19. `api/src/middleware/auth.ts` — `requireAuth(request, env)` — validates `x-api-key` header → 401 on fail
20. `api/src/middleware/rateLimit.ts` — D1-based per-IP counter with sliding window
21. `api/src/routes/upload.ts` — `POST /api/media/upload`: auth → validate MIME + size → `generateFileKey` → `uploadObject` → `insertMedia` → `invalidatePattern` → return `{ success, url, key }`
22. `api/src/routes/list.ts` — `GET /api/media/list?type=&folder=&page=&limit=`: `getCached` → if miss: `queryMedia` → `setCached` → return `{ files[], total, page, limit }`
23. `api/src/routes/delete.ts` — `DELETE /api/media/delete` body `{ file_key }`: auth → `deleteObject` → `deleteMedia` → `invalidatePattern` → 200 OK

## Phase 6 — API: Entry Point & Config

24. `api/src/worker.ts` — URL router: parse pathname, route to handler, attach CORS headers on all responses, 404 fallback
25. `api/wrangler.toml` — name, compatibility_date, R2 binding `MEDIA_BUCKET`, D1 binding `DB`, KV binding `MEDIA_CACHE`, vars `CDN_BASE_URL`
26. `api/.dev.vars` — `ADMIN_API_KEY=dev-secret` (gitignored)
27. `api/package.json`, `api/tsconfig.json`

## Phase 7 — Dashboard: Scaffold & API Client

28. `dashboard/` — Vite + React + TypeScript project (`npm create vite@latest`)
29. `dashboard/src/services/api.ts` — typed API client: `uploadMedia()`, `listMedia()`, `deleteMedia()` — reads `VITE_API_URL` env var
30. `dashboard/src/types/index.ts` — shared frontend types mirroring `MediaRecord`
31. `dashboard/.env.local` — `VITE_API_URL=http://localhost:8787` (dev), `.env.production` → Worker URL

## Phase 8 — Dashboard: Components (parallel)

32. `dashboard/src/components/UploadPanel.tsx` — drag-and-drop dropzone + file picker, folder input, type selector, progress bar, calls `uploadMedia()`, shows result CDN URL
33. `dashboard/src/components/Gallery.tsx` — infinite-scroll grid, fetches `listMedia()`, renders `MediaCard` per item, handles empty state
34. `dashboard/src/components/MediaCard.tsx` — thumbnail preview (uses `/cdn-cgi/image/width=400/` for images), filename, size, type badge, "Copy URL" button (clipboard API), "Delete" button with confirm
35. `dashboard/src/components/FilterBar.tsx` — type filter tabs (All / Images / Videos / Files), folder dropdown, search input (client-side filter)

## Phase 9 — Dashboard: App Shell & Styling

36. `dashboard/src/App.tsx` — layout shell: sidebar nav, tab routing between Upload and Gallery views, API key input stored in `localStorage`
37. `dashboard/src/styles/globals.css` — professional dark/light theme, CSS custom properties, responsive grid layout (no external CSS framework)
38. `dashboard/vite.config.ts`, `dashboard/wrangler.toml` (Pages deployment config)

---

## Full File Tree

```
media-platform/
├── api/
│   ├── src/
│   │   ├── worker.ts
│   │   ├── types.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── rateLimit.ts
│   │   ├── routes/
│   │   │   ├── upload.ts
│   │   │   ├── list.ts
│   │   │   └── delete.ts
│   │   ├── services/
│   │   │   ├── r2.ts
│   │   │   ├── database.ts
│   │   │   └── cache.ts
│   │   └── utils/
│   │       ├── fileName.ts
│   │       ├── validation.ts
│   │       └── response.ts
│   ├── schema.sql
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── dashboard/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── UploadPanel.tsx
│   │   │   ├── Gallery.tsx
│   │   │   ├── MediaCard.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── hooks/
│   │   │   ├── useMedia.ts
│   │   │   └── useUpload.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ARCHITECTURE.md
├── README.md
├── package.json           ← npm workspace root
└── .gitignore
```

---

## Verification

1. `cd api && wrangler dev` — Worker starts on `http://localhost:8787`
2. `POST /api/media/upload` with image → returns `{ success, url, key }`
3. `GET /api/media/list` → returns files; 2nd call hits KV cache (verify via Worker logs)
4. `DELETE /api/media/delete` → R2 + D1 cleared, cache invalidated
5. Missing `x-api-key` → 401; bad MIME → 415; oversized → 413
6. `cd dashboard && npm run dev` — dashboard opens on `http://localhost:5173`
7. Upload image via dashboard → appears in gallery immediately
8. Click "Copy URL" → CDN URL in clipboard
9. Delete from gallery → item disappears
10. `wrangler deploy` (api) + `wrangler pages deploy dist` (dashboard) — both live

---

## Decisions

- **Monorepo**: npm workspaces — `api/` and `dashboard/` are separate deployable units
- **TypeScript everywhere** — type safety for Cloudflare bindings and React components
- **React + Vite** for dashboard — component-based, fast build, Cloudflare Pages compatible
- **No CSS framework** — custom CSS properties for professional look without bundle bloat
- **No external npm deps in API** — zero dependencies in the Worker (pure CF bindings)
- **API key stored in localStorage** (dashboard) — single-admin use case, no OAuth needed
- **CDN domain is manual** Cloudflare dashboard step — documented with screenshots guide in README
- **Image optimization** via `/cdn-cgi/image/` URL prefix — zero extra API code
- **Cloudflare Stream**: out of scope v1 — R2 + CDN handles video streaming adequately

---

## Out of Scope (v2 Future)

- Signed/private media URLs
- Cloudflare Stream adaptive streaming
- Automated thumbnail server
- Video transcoding pipeline
- Multi-user auth with session tokens
- Media tagging + full-text search
