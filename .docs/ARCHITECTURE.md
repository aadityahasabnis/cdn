# Media Platform — Architecture Document

**Version:** 1.0  
**Date:** March 7, 2026  
**Stack:** Cloudflare Workers · R2 · D1 · KV · Pages · CDN

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Component Deep-Dive](#3-component-deep-dive)
4. [Data Architecture](#4-data-architecture)
5. [API Contract](#5-api-contract)
6. [Request Flow Diagrams](#6-request-flow-diagrams)
7. [Caching Strategy](#7-caching-strategy)
8. [Security Architecture](#8-security-architecture)
9. [Scalability Model](#9-scalability-model)
10. [Project Structure](#10-project-structure)
11. [Configuration Reference](#11-configuration-reference)
12. [Deployment Topology](#12-deployment-topology)
13. [Future Roadmap](#13-future-roadmap)

---

## 1. Executive Summary

This platform is a **self-hosted, Cloudflare-native media management system** modeled after Cloudinary but running entirely on Cloudflare's free-tier-compatible primitives.

**What it does:**

- Accepts image, video, and file uploads via an authenticated HTTP API
- Stores binaries in Cloudflare R2 (object storage)
- Stores rich metadata in Cloudflare D1 (SQLite edge database)
- Caches gallery results in Cloudflare KV (globally replicated key-value store)
- Delivers all files through Cloudflare's global CDN at zero egress cost
- Provides an admin dashboard (React + Vite on Cloudflare Pages) for upload, gallery browsing, URL copying, and deletion

**Why Cloudflare-only:**

| Concern          | Cloudflare Solution       | Benefit                                    |
|------------------|---------------------------|--------------------------------------------|
| Compute          | Workers (edge runtime)    | 0 ms cold start, 300+ edge locations       |
| Binary storage   | R2                        | S3-compatible, zero egress fees            |
| Metadata queries | D1                        | SQLite, read replicas, free tier 5 GB      |
| Gallery cache    | KV                        | Globally replicated, sub-ms read latency   |
| CDN delivery     | CDN / R2 public bucket    | Automatic global caching, free bandwidth   |
| Admin UI         | Pages                     | Git-connected, free hosting, CDN-backed    |

---

## 2. System Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│              Admin Dashboard                      │
│        (React + Vite · Cloudflare Pages)          │
│   Upload Panel · Gallery · Copy URL · Delete      │
└──────────────────┬───────────────────────────────┘
                   │  HTTPS + x-api-key header
                   ▼
┌──────────────────────────────────────────────────┐
│              Media API Worker                     │
│           (Cloudflare Workers · TypeScript)       │
│                                                   │
│  ┌───────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Auth    │  │  Rate Limit │  │    CORS    │  │
│  │Middleware │  │ Middleware  │  │  Handler   │  │
│  └─────┬─────┘  └──────┬──────┘  └────────────┘  │
│        └───────────────┘                         │
│                   │                              │
│        ┌──────────┼──────────┐                  │
│        ▼          ▼          ▼                  │
│   [POST]      [GET]      [DELETE]               │
│   /upload     /list      /delete                │
└───┬───────────────┬──────────┬──────────────────┘
    │               │          │
    ▼               ▼          ▼
┌───────┐    ┌──────────┐  ┌──────┐
│  R2   │    │    D1    │  │  KV  │
│       │◄───│          │  │      │
│Binary │    │Metadata  │  │Cache │
│Store  │    │Database  │  │Layer │
└───┬───┘    └──────────┘  └──────┘
    │
    ▼
┌──────────────────────────────────────────────────┐
│              Cloudflare CDN                       │
│         cdn.yourdomain.com                        │
│   Global edge caching · WebP · Resize            │
└──────────────────────────────────────────────────┘
                   │
                   ▼
        Public consumers (blogs, CMS, apps)
        <img src="https://cdn.yourdomain.com/..." />
```

### Deployment Units

| Unit           | Technology          | Host                  | URL                              |
|----------------|---------------------|-----------------------|----------------------------------|
| `api/`         | Cloudflare Worker   | Workers edge network  | `https://media-api.yourname.workers.dev` |
| `dashboard/`   | React + Vite        | Cloudflare Pages      | `https://media-admin.pages.dev`  |
| Media files    | R2 + CDN            | Cloudflare global CDN | `https://cdn.yourdomain.com`     |

---

## 3. Component Deep-Dive

### 3.1 Media API Worker (`api/`)

The API is a single Cloudflare Worker that acts as the **complete backend**. It handles routing internally without a framework — using URL pattern matching on `request.url`.

**Responsibilities:**
- Route incoming HTTP requests to the correct handler
- Enforce API key authentication on mutating operations
- Apply rate limiting per client IP
- Orchestrate the upload pipeline (validate → store → record → invalidate cache)
- Return consistent JSON responses with proper HTTP status codes
- Handle CORS preflight requests

**Why no framework:**  
Hono, itty-router, etc. add bundle weight and abstraction layers. Since we only have three routes, a manual router is simpler, smaller, and faster to cold-start.

**Middleware Chain (applied per request):**

```
Request
  │
  ├─► CORS headers (always attached to every response)
  ├─► OPTIONS preflight → 204 (immediately exits)
  ├─► Auth check (POST, DELETE routes only)
  ├─► Rate limit check (all routes)
  └─► Route handler
```

---

### 3.2 R2 Object Storage

**Bucket:** `media-storage`

R2 is Cloudflare's S3-compatible object storage. Unlike S3, R2 has **zero egress fees** — files served through the CDN domain are free regardless of traffic volume.

**Key Structure (path convention):**

```
{type}/{folder}/{timestamp}-{nanoid}-{sanitized-filename}

Examples:
  images/blog/1741300000000-x7k3p-cat.png
  videos/tutorial/1741300000001-m2q9r-docker-intro.mp4
  files/docs/1741300000002-n5t8s-guide.pdf
  thumbnails/blog/1741300000000-x7k3p-cat.webp
```

**Design choices:**
- `timestamp` prefix makes keys time-sortable in R2 console
- `nanoid` (8 chars) provides collision resistance
- `sanitized-filename` retains human-readability
- Folder grouping allows folder-level CDN cache invalidation in future

**Served via:**  
R2 bucket connected to a custom domain (`cdn.yourdomain.com`) through the Cloudflare dashboard. No Worker is needed to proxy file reads — CDN serves directly, Workers are only involved in writes and deletes.

---

### 3.3 D1 Metadata Database

**Database:** `media-db`

D1 is Cloudflare's edge SQLite database. It stores structured metadata about every uploaded file, enabling gallery browsing, filtering, search, and tagging.

**Why D1 over storing metadata in KV:**
- KV is a flat key-value store — it cannot filter by folder, type, or date range
- D1 supports SQL queries (`WHERE file_type = 'image' AND folder = 'blog'`)
- D1 supports pagination (`LIMIT / OFFSET`)
- D1 supports future features like full-text search and tag queries

**Access pattern:**
- **Writes:** `INSERT` on every upload — happens inside the Worker
- **Reads:** `SELECT` with optional `WHERE` filters, `LIMIT/OFFSET` for pagination
- **Deletes:** `DELETE WHERE file_key = ?`
- **All reads are cached in KV** — D1 is only hit on cache miss or after invalidation

---

### 3.4 KV Cache Layer

**Namespace:** `MEDIA_CACHE`

KV is Cloudflare's globally replicated key-value store. It is **eventually consistent** but reads have sub-millisecond latency from any edge location. It is ideal for caching gallery results that change infrequently but are read constantly.

**Cache key schema:**

```
gallery:all                   ← all files, no filter
gallery:type:image            ← filtered by type
gallery:type:video
gallery:type:file
gallery:folder:blog           ← filtered by folder
gallery:type:image:folder:blog ← combined filter
```

**TTL:** 300 seconds (5 minutes)  
**Invalidation:** On every upload and delete, all `gallery:*` keys are deleted from KV.

**Cache behavior:**

```
GET /api/media/list?type=image&folder=blog
  │
  ├─► Look up KV key: gallery:type:image:folder:blog
  │     HIT  → return JSON immediately (< 1ms)
  │     MISS → query D1 → store in KV → return JSON
```

---

### 3.5 CDN (Cloudflare Global Network)

Files in R2 are served through a custom domain connected to the R2 bucket. Cloudflare's CDN automatically:

- Caches files at the nearest edge to the requesting user (200+ PoPs globally)
- Respects `Cache-Control` headers set on R2 objects
- Supports Cloudflare's built-in image transformation via the `/cdn-cgi/image/` URL prefix

**Image Optimization (zero extra code):**

```
# Original
https://cdn.yourdomain.com/images/blog/cat.png

# Resized to 800px wide, auto WebP conversion
https://cdn.yourdomain.com/cdn-cgi/image/width=800,format=auto/images/blog/cat.png

# Thumbnail (200x200 crop)
https://cdn.yourdomain.com/cdn-cgi/image/width=200,height=200,fit=cover/images/blog/cat.png

# Compressed only
https://cdn.yourdomain.com/cdn-cgi/image/quality=75,format=webp/images/blog/cat.png
```

This is built into Cloudflare — no Lambda, no ImageMagick, no extra Worker.

---

### 3.6 Admin Dashboard (`dashboard/`)

A React + Vite + TypeScript single-page application deployed to Cloudflare Pages.

**Pages:**

| View         | Path       | Description                                         |
|--------------|------------|-----------------------------------------------------|
| Upload       | `/`        | Drag-and-drop panel, folder selector, progress bar  |
| Gallery      | `/gallery` | Responsive media grid, filter bar, media cards      |

**Key UI behaviors:**
- API key is entered once and stored in `localStorage` — all API requests include it as `x-api-key`
- Gallery calls `GET /api/media/list` on load; after upload or delete it re-fetches
- `MediaCard` displays image previews through `/cdn-cgi/image/width=400/` transform
- Copy URL button uses the Clipboard API — no external lib needed
- Delete prompts a confirmation dialog before calling the API

---

## 4. Data Architecture

### 4.1 D1 Schema

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS media (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    file_key    TEXT NOT NULL UNIQUE,          -- R2 object key (path)
    public_url  TEXT NOT NULL,                 -- Full CDN URL
    file_type   TEXT NOT NULL                  -- 'image' | 'video' | 'file'
                CHECK (file_type IN ('image', 'video', 'file')),
    mime_type   TEXT NOT NULL,                 -- e.g. 'image/png'
    size        INTEGER NOT NULL,              -- File size in bytes
    folder      TEXT NOT NULL DEFAULT 'root',  -- Logical folder name
    tags        TEXT NOT NULL DEFAULT '[]',    -- JSON array of tag strings
    uploaded_at TEXT NOT NULL                  -- ISO 8601 UTC timestamp
                DEFAULT (datetime('now')),
    uploader_id TEXT                           -- Optional: future multi-user
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_media_file_type  ON media (file_type);
CREATE INDEX IF NOT EXISTS idx_media_folder     ON media (folder);
CREATE INDEX IF NOT EXISTS idx_media_uploaded   ON media (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type_folder ON media (file_type, folder);
```

**Why indexes on those columns:**
- `file_type` — gallery filter `WHERE file_type = 'image'` is the most common query
- `folder` — folder-based gallery filter
- `uploaded_at DESC` — default sort order in gallery (newest first)
- `(file_type, folder)` — composite index for combined filter queries

### 4.2 Media Record Shape

```typescript
interface MediaRecord {
    id:          number;
    file_key:    string;   // "images/blog/1741300000000-x7k3p-cat.png"
    public_url:  string;   // "https://cdn.yourdomain.com/images/blog/..."
    file_type:   'image' | 'video' | 'file';
    mime_type:   string;   // "image/png"
    size:        number;   // bytes
    folder:      string;   // "blog"
    tags:        string[]; // ["tutorial", "docker"]
    uploaded_at: string;   // "2026-03-07T12:00:00.000Z"
    uploader_id: string | null;
}
```

### 4.3 KV Value Shape

Cached gallery results are stored as serialized JSON:

```typescript
interface CachedGalleryResult {
    files:      MediaRecord[];
    total:      number;
    page:       number;
    limit:      number;
    cached_at:  string;  // ISO timestamp — useful for debug
}
```

---

## 5. API Contract

**Base URL:** `https://media-api.yourname.workers.dev`  
**Auth header** (required on POST and DELETE): `x-api-key: YOUR_ADMIN_SECRET`  
**Content-Type on upload:** `multipart/form-data`  
**Content-Type on all other requests/responses:** `application/json`

---

### 5.1 Upload File

```
POST /api/media/upload
```

**Request** (`multipart/form-data`):

| Field    | Type   | Required | Description                             |
|----------|--------|----------|-----------------------------------------|
| `file`   | File   | Yes      | The binary file to upload               |
| `folder` | string | No       | Logical folder name (default: `"root"`) |
| `type`   | string | No       | `image` \| `video` \| `file` (auto-detected from MIME if omitted) |
| `tags`   | string | No       | Comma-separated tags                    |

**Success Response** `200 OK`:

```json
{
    "success": true,
    "file_key": "images/blog/1741300000000-x7k3p-cat.png",
    "public_url": "https://cdn.yourdomain.com/images/blog/1741300000000-x7k3p-cat.png",
    "mime_type": "image/png",
    "size": 120394
}
```

**Error Responses:**

| Status | Condition                            |
|--------|--------------------------------------|
| `401`  | Missing or invalid `x-api-key`       |
| `413`  | File exceeds `MAX_UPLOAD_BYTES` limit |
| `415`  | MIME type not in allowlist           |
| `429`  | Rate limit exceeded                  |
| `500`  | R2 or D1 write failure               |

---

### 5.2 List Media

```
GET /api/media/list
```

**Query Parameters:**

| Param    | Type   | Default | Description                                    |
|----------|--------|---------|------------------------------------------------|
| `type`   | string | (all)   | Filter: `image` \| `video` \| `file`           |
| `folder` | string | (all)   | Filter by folder name                          |
| `limit`  | number | `50`    | Items per page (max `100`)                     |
| `page`   | number | `1`     | Page number (1-indexed)                        |

**Success Response** `200 OK`:

```json
{
    "success": true,
    "files": [ /* MediaRecord[] */ ],
    "total": 247,
    "page": 1,
    "limit": 50,
    "pages": 5,
    "from_cache": true
}
```

---

### 5.3 Delete File

```
DELETE /api/media/delete
```

**Request Body** (`application/json`):

```json
{
    "file_key": "images/blog/1741300000000-x7k3p-cat.png"
}
```

**Success Response** `200 OK`:

```json
{
    "success": true,
    "file_key": "images/blog/1741300000000-x7k3p-cat.png",
    "message": "File deleted successfully"
}
```

**Error Responses:**

| Status | Condition                       |
|--------|---------------------------------|
| `401`  | Missing or invalid `x-api-key`  |
| `400`  | Missing `file_key` in body      |
| `404`  | `file_key` not found in D1      |
| `429`  | Rate limit exceeded             |

---

## 6. Request Flow Diagrams

### 6.1 Upload Flow

```
Client (Dashboard)
    │
    │  POST /api/media/upload
    │  x-api-key: SECRET
    │  Content-Type: multipart/form-data
    │
    ▼
Worker Entry (worker.ts)
    │
    ├─► Attach CORS headers to response
    ├─► Parse URL → route to upload handler
    │
    ▼
Auth Middleware (middleware/auth.ts)
    │
    ├─► Read x-api-key header
    ├─► Compare to env.ADMIN_API_KEY (constant-time comparison)
    │     FAIL → return 401 immediately
    │     PASS → continue
    │
    ▼
Rate Limit Middleware (middleware/rateLimit.ts)
    │
    ├─► Extract CF-Connecting-IP header
    ├─► Query D1: SELECT count FROM rate_limits WHERE ip = ? AND window = ?
    │     EXCEEDED → return 429 immediately
    │     OK → increment counter → continue
    │
    ▼
Upload Handler (routes/upload.ts)
    │
    ├─► Parse multipart/form-data
    ├─► Extract: file (Blob), folder, type, tags
    ├─► validateMimeType(file.type)  → 415 if rejected
    ├─► validateFileSize(file.size)  → 413 if too large
    ├─► generateFileKey(folder, file.name)
    │       → "images/blog/1741300000000-x7k3p-cat.png"
    │
    ├─► [PARALLEL]:
    │       uploadObject(env.MEDIA_BUCKET, key, body, contentType)
    │                 │
    │                 └─► R2.put(key, stream, { httpMetadata })
    │
    ├─► Construct CDN URL: env.CDN_BASE_URL + "/" + key
    │
    ├─► insertMedia(env.DB, record)
    │       └─► D1: INSERT INTO media VALUES (...)
    │
    ├─► invalidatePattern(env.MEDIA_CACHE, "gallery:")
    │       └─► KV: DELETE gallery:*, gallery:type:image, etc.
    │
    └─► Return { success, file_key, public_url, size, mime_type }
```

---

### 6.2 List (Gallery) Flow — Cache Hit

```
Client (Dashboard)
    │
    │  GET /api/media/list?type=image&folder=blog&page=1&limit=50
    │
    ▼
Worker → Rate Limit check → List Handler
    │
    ├─► Build cache key: "gallery:type:image:folder:blog:p1:l50"
    │
    ├─► KV.get(cacheKey)
    │     HIT → parse JSON → return { ...result, from_cache: true }
    │              ↑
    │        (network round-trip avoided entirely)
    │
    └─► (cache miss path — see below)
```

### 6.3 List (Gallery) Flow — Cache Miss

```
    ├─► KV.get(cacheKey) → null (miss)
    │
    ├─► D1: SELECT * FROM media
    │        WHERE file_type = 'image' AND folder = 'blog'
    │        ORDER BY uploaded_at DESC
    │        LIMIT 50 OFFSET 0
    │
    ├─► D1: SELECT COUNT(*) FROM media
    │        WHERE file_type = 'image' AND folder = 'blog'
    │
    ├─► KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
    │
    └─► return { ...result, from_cache: false }
```

---

### 6.4 Delete Flow

```
Client
    │  DELETE /api/media/delete
    │  { "file_key": "images/blog/cat.png" }
    │
    ▼
Worker → Auth → Rate Limit → Delete Handler
    │
    ├─► Parse JSON body → extract file_key
    ├─► Validate file_key exists in D1 → 404 if not found
    │
    ├─► [PARALLEL]:
    │       R2.delete(file_key)
    │       D1: DELETE FROM media WHERE file_key = ?
    │
    ├─► invalidatePattern(env.MEDIA_CACHE, "gallery:")
    │
    └─► return { success: true, file_key, message }
```

---

### 6.5 CDN File Delivery (No Worker Involved)

```
Browser / App
    │
    │  GET https://cdn.yourdomain.com/images/blog/cat.png
    │
    ▼
Cloudflare CDN Edge (nearest PoP)
    │
    ├─► Cache HIT → serve from edge memory (< 5ms globally)
    │
    └─► Cache MISS → fetch from R2 → cache at edge → serve
                                   (subsequent requests served from edge)
```

---

## 7. Caching Strategy

### Layer Summary

| Layer          | Technology       | What is cached              | TTL        |
|----------------|------------------|-----------------------------|------------|
| CDN edge       | Cloudflare CDN   | Binary file bytes           | Until file changes |
| Gallery API    | Cloudflare KV    | Serialized D1 query results | 300 seconds |

### KV Cache Key Conventions

| Scenario                          | Cache Key                               |
|-----------------------------------|-----------------------------------------|
| All files, page 1                 | `gallery:all:p1:l50`                    |
| Images only                       | `gallery:type:image:p1:l50`             |
| Videos only                       | `gallery:type:video:p1:l50`             |
| Blog folder only                  | `gallery:folder:blog:p1:l50`            |
| Images in blog folder             | `gallery:type:image:folder:blog:p1:l50` |

### Cache Invalidation

On **upload** or **delete**, the Worker calls `invalidatePattern()` which deletes the full set of known gallery cache keys. This is a full invalidation (not selective), ensuring correctness at the cost of one D1 query on the next request.

**Why full invalidation (not selective):**
- New upload invalidates all gallery views (type-all, type-image, folder-blog, etc.)
- The gallery has bounded query combinations — invalidating ~10–15 keys is fast
- Selective invalidation would require tracking which keys actually exist in KV, adding complexity without meaningful benefit at this scale

---

## 8. Security Architecture

### 8.1 Authentication

Only `POST /api/media/upload` and `DELETE /api/media/delete` require authentication.  
`GET /api/media/list` is intentionally public to allow lightweight frontend integrations.

**Mechanism:**

```
Request header:  x-api-key: ADMIN_SECRET_VALUE
Env variable:    ADMIN_API_KEY = "ADMIN_SECRET_VALUE"
```

Comparison uses a **constant-time string comparison** to prevent timing attacks:

```typescript
// Correct — constant-time
const isValid = timingSafeEqual(
    new TextEncoder().encode(providedKey),
    new TextEncoder().encode(env.ADMIN_API_KEY)
);

// Wrong — early-exit allows timing oracle
const isValid = providedKey === env.ADMIN_API_KEY;
```

### 8.2 MIME Type Allowlist

Uploads are rejected unless their MIME type is in the allowlist:

```typescript
const ALLOWED_MIME_TYPES = new Set([
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/avif', 'image/tiff',
    // Videos
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'video/x-msvideo',
    // Documents
    'application/pdf',
    // Archives
    'application/zip', 'application/x-tar', 'application/gzip',
]);
```

The MIME type is read from the `Content-Type` of the form-data `File` object — controlled by the browser. Server-side magic-byte sniffing is not performed (out of scope for v1).

### 8.3 File Size Limits

Controlled via environment variable `MAX_UPLOAD_BYTES` (default: `104857600` = 100 MB).

```
Request body size checked before reading file into memory.
If Content-Length header exceeds limit → reject immediately (413).
If Content-Length absent → read stream, abort and return 413 if limit reached.
```

### 8.4 Rate Limiting

A simple **sliding-window counter** implemented in D1:

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
    ip         TEXT NOT NULL,
    window     INTEGER NOT NULL,  -- Unix minute bucket
    count      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (ip, window)
);
```

- Window = `Math.floor(Date.now() / 60000)` (current minute bucket)
- Limit = 30 requests per minute per IP (configurable via `RATE_LIMIT_PER_MIN` env var)
- Stale rows (older windows) are cleaned up asynchronously using `ctx.waitUntil()`

### 8.5 CORS Policy

Since the dashboard (Pages) and API (Worker) are on different origins, the Worker attaches CORS headers on every response:

```
Access-Control-Allow-Origin:  https://media-admin.pages.dev
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, x-api-key
Access-Control-Max-Age:       86400
```

In development, `Access-Control-Allow-Origin` is set to `*`.  
In production, it is locked to the specific Pages domain.

### 8.6 What Public Users Can Do

```
✅  GET CDN binary files (cdn.yourdomain.com/...)
✅  GET /api/media/list (gallery metadata — read-only, public)
❌  POST /api/media/upload (requires x-api-key)
❌  DELETE /api/media/delete (requires x-api-key)
```

---

## 9. Scalability Model

### 9.1 Workers

Cloudflare Workers execute at the edge — the Worker process runs at the nearest data center to the request origin. There is no centralized server to scale.

| Concern             | Behavior                                                     |
|---------------------|--------------------------------------------------------------|
| Concurrent requests | Handled by separate isolates — no shared state between requests |
| Scale              | Automatically scales to millions of requests/day             |
| Cold start          | ~0ms (V8 isolates, no container spin-up)                    |
| Request limit (free)| 100,000 requests/day — upgradeable                          |

### 9.2 R2

R2 is object storage — it scales infinitely with no configuration. The only practical limit is per-request bandwidth.

| Concern         | Detail                                          |
|-----------------|-------------------------------------------------|
| Storage         | Unlimited (billed $0.015/GB/month after 10 GB free) |
| Egress          | Zero — no CDN egress cost ever                  |
| Concurrency     | Unlimited simultaneous reads and writes         |

### 9.3 D1

D1 is SQLite at the edge with automatic read replication.

| Concern          | Free Tier                   | Scaling path                         |
|------------------|-----------------------------|--------------------------------------|
| Storage          | 5 GB                        | Paid plan: unlimited                 |
| Row reads/day    | 5 million                   | Paid plan: unlimited                 |
| Row writes/day   | 100,000                     | Paid plan: unlimited                 |
| Query latency    | ~5–15ms (edge replica)      | Consistent at scale                  |

KV cache absorbs most reads — D1 is only hit on cache misses (first request after TTL expiry or after upload/delete).

### 9.4 KV

KV is Cloudflare's globally replicated store. Data written in one region propagates to all edges.

| Concern          | Detail                                       |
|------------------|----------------------------------------------|
| Read latency     | Sub-millisecond at any edge                  |
| Write latency    | ~60ms (eventual consistency)                 |
| Consistency      | Eventually consistent — TTL handles staleness |
| Free tier        | 1 GB storage, 10M reads/day, 1M writes/day   |

### 9.5 CDN

Binary files served via CDN are cached at edge nodes. Cloudflare has 300+ PoPs globally.

- A file requested from Tokyo by 1,000 users will be fetched from R2 **once** — subsequent requests are served from Tokyo's cache
- Cache lifetime is controlled by `Cache-Control` headers on R2 objects

---

## 10. Project Structure

```
media-platform/
│
├── api/                              ← Cloudflare Worker (TypeScript)
│   ├── src/
│   │   ├── worker.ts                 ← Entry point: URL router + CORS
│   │   ├── types.ts                  ← Shared interfaces (Env, MediaRecord, etc.)
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts               ← x-api-key validation (constant-time)
│   │   │   └── rateLimit.ts          ← D1-based sliding window rate limiter
│   │   │
│   │   ├── routes/
│   │   │   ├── upload.ts             ← POST /api/media/upload
│   │   │   ├── list.ts               ← GET  /api/media/list
│   │   │   └── delete.ts             ← DELETE /api/media/delete
│   │   │
│   │   ├── services/
│   │   │   ├── r2.ts                 ← uploadObject(), deleteObject()
│   │   │   ├── database.ts           ← insertMedia(), queryMedia(), deleteMedia()
│   │   │   └── cache.ts              ← getCached(), setCached(), invalidatePattern()
│   │   │
│   │   └── utils/
│   │       ├── fileName.ts           ← generateFileKey() — collision-safe naming
│   │       ├── validation.ts         ← validateMimeType(), validateFileSize()
│   │       └── response.ts           ← jsonOk(), jsonError(), corsHeaders()
│   │
│   ├── schema.sql                    ← D1 migration: CREATE TABLE media + indexes
│   ├── wrangler.toml                 ← Bindings: R2, D1, KV + env vars
│   ├── .dev.vars                     ← Local secrets (gitignored)
│   ├── package.json
│   └── tsconfig.json
│
├── dashboard/                        ← React + Vite + TypeScript (Cloudflare Pages)
│   ├── src/
│   │   ├── main.tsx                  ← React entry point
│   │   ├── App.tsx                   ← App shell: sidebar + tab routing
│   │   │
│   │   ├── components/
│   │   │   ├── UploadPanel.tsx       ← Drag-and-drop upload, progress, result URL
│   │   │   ├── Gallery.tsx           ← Media grid with filter bar
│   │   │   ├── MediaCard.tsx         ← Preview, type badge, Copy URL, Delete
│   │   │   └── FilterBar.tsx         ← Type tabs, folder dropdown, search
│   │   │
│   │   ├── hooks/
│   │   │   ├── useMedia.ts           ← Gallery state: fetch, filter, pagination
│   │   │   └── useUpload.ts          ← Upload state: progress, result, error
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                ← HTTP client: uploadMedia(), listMedia(), deleteMedia()
│   │   │
│   │   ├── types/
│   │   │   └── index.ts              ← Frontend types (mirrors api/src/types.ts)
│   │   │
│   │   └── styles/
│   │       └── globals.css           ← CSS custom properties, dark theme, grid layout
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ARCHITECTURE.md                   ← This document
├── README.md                         ← Setup guide + CLI commands
├── package.json                      ← npm workspace root { "workspaces": ["api","dashboard"] }
└── .gitignore
```

---

## 11. Configuration Reference

### api/wrangler.toml

```toml
name            = "media-api"
main            = "src/worker.ts"
compatibility_date = "2025-01-01"

[[r2_buckets]]
binding  = "MEDIA_BUCKET"
bucket_name = "media-storage"

[[d1_databases]]
binding      = "DB"
database_name = "media-db"
database_id  = "REPLACE_WITH_YOUR_D1_ID"

[[kv_namespaces]]
binding = "MEDIA_CACHE"
id      = "REPLACE_WITH_YOUR_KV_ID"

[vars]
CDN_BASE_URL       = "https://cdn.yourdomain.com"
MAX_UPLOAD_BYTES   = "104857600"
RATE_LIMIT_PER_MIN = "30"
ENVIRONMENT        = "production"
```

### api/.dev.vars (local only — gitignored)

```
ADMIN_API_KEY=dev-secret-change-in-production
CDN_BASE_URL=http://localhost:8787/dev-cdn
```

### dashboard/.env.local (local only — gitignored)

```
VITE_API_URL=http://localhost:8787
VITE_ADMIN_KEY=dev-secret-change-in-production
```

### dashboard/.env.production

```
VITE_API_URL=https://media-api.yourname.workers.dev
```

---

## 12. Deployment Topology

### Resource Provisioning (run once)

```bash
# 1. Authenticate
wrangler login

# 2. Create R2 bucket
wrangler r2 bucket create media-storage

# 3. Create D1 database — copy the database_id into wrangler.toml
wrangler d1 create media-db

# 4. Run D1 migration
wrangler d1 execute media-db --file=api/schema.sql

# 5. Create KV namespace — copy the id into wrangler.toml
wrangler kv:namespace create MEDIA_CACHE

# 6. Set production secret (stored in Cloudflare Secrets Vault)
wrangler secret put ADMIN_API_KEY
# → Enter your secret and press Enter

# 7. Connect R2 to CDN domain (manual):
#    Cloudflare Dashboard → R2 → media-storage → Settings → Custom Domain
#    Add: cdn.yourdomain.com
```

### CI/CD Deployment

```bash
# Deploy Worker API
cd api
wrangler deploy

# Build and deploy Dashboard
cd ../dashboard
npm run build
wrangler pages deploy dist --project-name=media-admin
```

### Environment Matrix

| Environment | API URL                                       | Dashboard URL                            |
|-------------|-----------------------------------------------|------------------------------------------|
| Local dev   | `http://localhost:8787`                       | `http://localhost:5173`                  |
| Production  | `https://media-api.yourname.workers.dev`      | `https://media-admin.pages.dev`          |
| Custom domain | `https://api.yourdomain.com`               | `https://media.yourdomain.com`           |

---

## 13. Future Roadmap

### v1.1 — Thumbnail Generation
- On image upload, invoke a second R2 put with a Cloudflare Image resized URL
- Store `thumbnail_url` in D1 alongside `public_url`
- Dashboard uses thumbnail for grid preview (reduces bandwidth in gallery)

### v1.2 — Tag Search
- Add full-text search: `SELECT * FROM media WHERE tags LIKE '%docker%'`
- Dashboard: search input that queries `/api/media/list?search=docker`
- D1 FTS5 virtual table for performant search at scale

### v1.3 — Cloudflare Stream Integration
- On video upload, optionally push to Cloudflare Stream (adaptive HLS)
- Store Stream `uid` in D1; serve via `https://videodelivery.net/{uid}/manifest/video.m3u8`
- Dashboard: HTML `<video>` with Stream player embed

### v1.4 — Signed Private URLs
- Add `visibility` column to D1: `'public' | 'private'`
- Private files stored in R2 without CDN domain access
- Worker generates time-limited HMAC-signed URLs for private file access

### v1.5 — Multi-User Auth
- Replace API key with Cloudflare Access (SSO/OAuth2 gateway in front of dashboard)
- Add `uploader_id` to every media row (already in schema)
- Gallery filtered by uploader; admin sees all

### v2.0 — Media Analytics
- Cloudflare Workers Analytics Engine: log every CDN request (no-op Worker in front of R2)
- Dashboard analytics page: views per file, bandwidth, popular content
- Zero external analytics service — pure Cloudflare

---

*Document maintained in `ARCHITECTURE.md` at the repository root.*  
*Update this document when system topology, API contracts, or data models change.*
