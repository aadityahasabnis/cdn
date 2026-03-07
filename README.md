# Media Service API

> **Professional media hosting backend for blogging platforms** - Built entirely on Cloudflare's free tier with production-ready architecture, comprehensive logging, and automated CI/CD.

[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy-Cloudflare%20Workers-orange)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.0-green)](https://hono.dev/)

## ⚡ Can't Delete Files? → [Read This](./HOW_TO_DELETE.md)
## 📁 Files Not Showing in Gallery? → [Fixed!](./GALLERY_BUG_FIX.md)

## 🚀 Quick Links

- **[Setup Guide](./SETUP.md)** - Get started in 5 minutes
- **[API Usage](./API_USAGE.md)** - Integration examples for your project
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## Live Demo

**Admin UI:** https://cdn.aadityahasabnis.workers.dev/  
**API Endpoint:** https://cdn.aadityahasabnis.workers.dev/api  

## Features

### Core Functionality
- **File Upload** - Images, videos, and documents via authenticated REST API
- **R2 Storage** - Zero egress fees, S3-compatible object storage
- **D1 Database** - SQLite at the edge for metadata and search
- **KV Cache** - Sub-millisecond global reads for gallery queries
- **CDN Delivery** - Cloudflare's global network with automatic optimization
- **Image Transforms** - Built-in resize, crop, format conversion

### Production-Ready Architecture
- **Custom Error Classes** - Structured error hierarchy with proper status codes
- **Structured Logging** - JSON logs with request ID correlation
- **Request Tracing** - Track requests across all service layers
- **Environment Validation** - Fail fast on startup with missing config
- **Type Safety** - Full TypeScript with strict mode
- **Zero Magic Numbers** - All constants centralized and documented
- **Comprehensive JSDoc** - Every function fully documented

### Developer Experience
- **Modern Test UI** - Professional admin panel with drag-and-drop upload
- **CI/CD Pipeline** - Automatic deployment via GitHub Actions
- **Complete Documentation** - Commands, environment variables, API reference
- **Rate Limiting** - Built-in protection against abuse
- **Cache Invalidation** - Smart cache busting on mutations

## Quick Start

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd media-service

# Install dependencies
npm install

# Authenticate with Cloudflare
npx wrangler login
```

### Initial Setup

```bash
# Create Cloudflare resources
npx wrangler r2 bucket create media-storage
npx wrangler d1 create media-db
npx wrangler kv namespace create MEDIA_CACHE

# Initialize database
npx wrangler d1 execute media-db --file=schema.sql

# Set production secret
npx wrangler secret put ADMIN_API_KEY
```

### Configuration

1. Update `wrangler.jsonc` with your resource IDs (from create commands above)
2. Create `.dev.vars` for local development:
   ```
   ADMIN_API_KEY=test-key-123
   ```
3. Configure CDN_BASE_URL in `wrangler.jsonc` (see [ENV.md](./ENV.md))

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:8787/` for the admin panel.

### Deploy to Production

```bash
npm run deploy
```

## Project Structure

```
media-service/
├── src/
│   ├── constants/          # Centralized constants (no magic numbers)
│   │   └── index.ts
│   ├── config/             # Environment validation & configuration
│   │   └── index.ts
│   ├── lib/                # Core infrastructure
│   │   ├── errors.ts       # Custom error class hierarchy
│   │   └── logger.ts       # Structured JSON logger
│   ├── middleware/         # Request processing
│   │   ├── auth.ts         # API key authentication & rate limiting
│   │   └── requestId.ts    # Request ID generation & logging
│   ├── services/           # Business logic layer
│   │   ├── r2.ts           # R2 object storage operations
│   │   ├── database.ts     # D1 database queries
│   │   └── cache.ts        # KV cache management
│   ├── endpoints/          # API route handlers
│   │   ├── upload.ts       # POST /api/media/upload
│   │   ├── listMedia.ts    # GET /api/media/list
│   │   └── deleteMedia.ts  # DELETE /api/media/delete
│   ├── utils/              # Helper functions
│   │   ├── fileName.ts     # Collision-safe file naming
│   │   ├── validation.ts   # Input validation
│   │   └── response.ts     # Response formatting
│   ├── ui/                 # Admin interface
│   │   └── testUI.ts       # Professional gallery UI
│   ├── types.ts            # TypeScript type definitions
│   └── index.ts            # Main entry point & routes
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD automation
├── schema.sql              # D1 database schema
├── wrangler.jsonc          # Cloudflare configuration
├── .dev.vars              # Local secrets (gitignored)
├── COMMANDS.md            # Complete command reference
├── ENV.md                 # Environment variable documentation
└── README.md              # This file
```

## API Reference

### Upload Media

```http
POST /api/media/upload
```

**Headers:**
- `x-api-key: YOUR_ADMIN_KEY` (required)
- `Content-Type: multipart/form-data`

**Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |
| `folder` | string | No | Folder name (default: "root") |
| `type` | string | No | "image" \| "video" \| "file" (auto-detected) |
| `tags` | string | No | Comma-separated tags |

**Response:**
```json
{
  "success": true,
  "file_key": "images/blog/1741300000000-x7k3p-cat.png",
  "public_url": "https://cdn.yourdomain.com/images/blog/1741300000000-x7k3p-cat.png",
  "mime_type": "image/png",
  "size": 120394
}
```

### List Media

```http
GET /api/media/list
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | (all) | Filter: "image" \| "video" \| "file" |
| `folder` | string | (all) | Filter by folder name |
| `limit` | number | 50 | Items per page (1-100) |
| `page` | number | 1 | Page number (1+) |

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": 1,
      "file_key": "images/blog/cat.png",
      "public_url": "https://cdn.yourdomain.com/images/blog/cat.png",
      "file_type": "image",
      "mime_type": "image/png",
      "size": 120394,
      "folder": "blog",
      "tags": "tutorial,cloudflare",
      "created_at": "2026-03-07T12:00:00.000Z"
    }
  ],
  "total": 247,
  "page": 1,
  "limit": 50,
  "pages": 5,
  "from_cache": true
}
```

### Delete Media

```http
DELETE /api/media/delete
```

**Headers:**
- `x-api-key: YOUR_ADMIN_KEY` (required)
- `Content-Type: application/json`

**Body:**
```json
{
  "file_key": "images/blog/1741300000000-x7k3p-cat.png"
}
```

**Response:**
```json
{
  "success": true,
  "file_key": "images/blog/1741300000000-x7k3p-cat.png",
  "message": "File deleted successfully"
}
```

**Alternative:** Delete by ID
```http
DELETE /api/media/:id
```

### Get Statistics

```http
GET /api/media/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_files": 247,
    "total_size": 1073741824,
    "by_type": {
      "image": 150,
      "video": 50,
      "file": 47
    },
    "by_folder": {
      "blog": 120,
      "gallery": 80,
      "documents": 47
    },
    "recent_uploads": 15
  }
}
```

### Get Folders

```http
GET /api/media/folders
```

**Response:**
```json
{
  "success": true,
  "folders": [
    { "folder": "blog", "count": 120 },
    { "folder": "gallery", "count": 80 },
    { "folder": "root", "count": 47 }
  ]
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "media-service",
  "timestamp": "2026-03-07T12:00:00.000Z"
}
```

## Admin Panel

Access the professional admin UI at your worker URL:

```
https://your-worker.workers.dev/
```

**Features:**
- Drag-and-drop file upload
- Gallery view with thumbnails
- Filter by type and folder
- Pagination controls
- Copy URL to clipboard
- Delete with confirmation
- Real-time statistics
- Responsive design

## Image Optimization

Cloudflare automatically provides image transformations via the `/cdn-cgi/image/` prefix:

```
# Resize to 800px width
https://cdn.yourdomain.com/cdn-cgi/image/width=800/images/blog/cat.png

# Thumbnail (200x200 crop)
https://cdn.yourdomain.com/cdn-cgi/image/width=200,height=200,fit=cover/images/blog/cat.png

# WebP conversion with quality
https://cdn.yourdomain.com/cdn-cgi/image/quality=75,format=webp/images/blog/cat.png

# Multiple transforms
https://cdn.yourdomain.com/cdn-cgi/image/width=400,quality=85,format=auto/images/blog/cat.png
```

[See Cloudflare Image Resizing docs](https://developers.cloudflare.com/images/image-resizing/)

## Usage Examples

### JavaScript/TypeScript

```typescript
// Upload a file
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'blog');
formData.append('tags', 'tutorial,cloudflare');

const response = await fetch('https://your-worker.workers.dev/api/media/upload', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY'
  },
  body: formData
});

const { public_url } = await response.json();
console.log('Uploaded:', public_url);
```

### cURL

```bash
# Upload
curl -X POST https://your-worker.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@image.png" \
  -F "folder=blog"

# List
curl "https://your-worker.workers.dev/api/media/list?type=image&limit=20"

# Delete
curl -X DELETE https://your-worker.workers.dev/api/media/delete \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_key":"images/blog/1741300000000-x7k3p-cat.png"}'
```

### React Example

```tsx
import { useState } from 'react';

function ImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'blog');
    
    try {
      const response = await fetch('https://your-worker.workers.dev/api/media/upload', {
        method: 'POST',
        headers: { 'x-api-key': process.env.MEDIA_API_KEY },
        body: formData
      });
      
      const { public_url } = await response.json();
      setUrl(public_url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {uploading && <p>Uploading...</p>}
      {url && <img src={url} alt="Uploaded" />}
    </div>
  );
}
```

## Development

### Available Commands

See [COMMANDS.md](./COMMANDS.md) for the complete command reference.

**Quick reference:**
```bash
npm run dev          # Start local dev server
npm run deploy       # Deploy to production
npm run typecheck    # Run TypeScript type checking
npm run db:init      # Initialize production database
npm run db:query     # Query production database
npx wrangler tail    # Stream production logs
```

### Environment Variables

See [ENV.md](./ENV.md) for complete environment variable documentation.

**Required variables:**
- `ADMIN_API_KEY` - API key for authenticated endpoints
- `CDN_BASE_URL` - R2 public domain for file URLs
- `MAX_UPLOAD_BYTES` - Maximum file size (default: 10MB)

### Local Development Tips

1. **Use local mode for faster iteration:**
   ```bash
   npm run dev
   ```

2. **Monitor logs in real-time:**
   ```bash
   npx wrangler tail --format pretty
   ```

3. **Query local database:**
   ```bash
   npx wrangler d1 execute media-db --local --command "SELECT * FROM media LIMIT 10"
   ```

4. **Test with the admin UI:**
   Visit `http://localhost:8787/` after `npm run dev`

## CI/CD Setup

This project includes automated deployment via GitHub Actions.

### Setup Instructions

1. **Create GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Get Cloudflare credentials:**
   ```bash
   npx wrangler whoami
   ```
   Note your Account ID.

3. **Create API token:**
   - Visit: https://dash.cloudflare.com/profile/api-tokens
   - Create token with "Edit Cloudflare Workers" template
   - Copy the token

4. **Add GitHub secrets:**
   - Go to: Settings → Secrets → Actions
   - Add `CLOUDFLARE_API_TOKEN` with your API token
   - Add `CLOUDFLARE_ACCOUNT_ID` with your account ID

5. **Push to trigger deployment:**
   ```bash
   git push origin main
   ```

The workflow will automatically:
- Run type checking
- Deploy to Cloudflare Workers
- Display the production URL

## Error Handling

All errors follow a consistent format with proper HTTP status codes:

| Status | Error Class | Description |
|--------|-------------|-------------|
| 400 | `ValidationError` | Invalid input (bad request) |
| 401 | `AuthenticationError` | Missing or invalid API key |
| 403 | `AuthorizationError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Resource conflict |
| 413 | `ValidationError` | File too large |
| 415 | `ValidationError` | Unsupported file type |
| 429 | `RateLimitError` | Rate limit exceeded |
| 500 | `StorageError` | R2 storage error |
| 500 | `DatabaseError` | D1 database error |
| 500 | `CacheError` | KV cache error (non-critical) |

**Error response format:**
```json
{
  "success": false,
  "error": "File not found",
  "code": "NOT_FOUND",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

In production, error details are hidden. In development, full stack traces are included.

## Architecture

### Request Flow

```
Client Request
    ↓
Environment Validation Middleware
    ↓
Request ID Middleware (generates UUID, attaches logger)
    ↓
CORS Middleware
    ↓
Rate Limiting (if authenticated endpoint)
    ↓
Authentication (if required)
    ↓
Route Handler
    ↓
Service Layer (R2, D1, KV)
    ↓
Response with Request ID header
```

### Logging

All operations are logged with structured JSON:

```json
{
  "level": "INFO",
  "timestamp": "2026-03-07T12:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Upload completed successfully",
  "context": {
    "fileKey": "images/blog/cat.png",
    "size": 120394
  }
}
```

Logs include request IDs for tracing across all service layers.

### Caching Strategy

- **Gallery queries:** 5-minute TTL in KV
- **Cache keys:** Built from query params (type, folder, page, limit)
- **Invalidation:** Smart invalidation on upload/delete
- **Fallback:** Graceful degradation if cache fails

### Security

- API key authentication via `x-api-key` header
- Rate limiting: 60 requests/minute per IP
- Input validation on all endpoints
- MIME type whitelist
- File size limits
- No directory traversal (collision-safe naming)

## Troubleshooting

### Common Issues

**1. "Database not initialized"**
```bash
npx wrangler d1 execute media-db --file=schema.sql
```

**2. "API key required"**
- Set local: Add to `.dev.vars`
- Set production: `npx wrangler secret put ADMIN_API_KEY`

**3. "CDN URL returns 404"**
- Verify R2 bucket has custom domain configured
- Check `CDN_BASE_URL` in `wrangler.jsonc`

**4. "Upload fails with 413"**
- Check `MAX_UPLOAD_BYTES` environment variable
- Default limit is 10MB

**5. "Rate limit exceeded"**
- Default: 60 requests/minute
- Adjust `RATE_LIMIT_PER_MIN` in `wrangler.jsonc`

See [COMMANDS.md](./COMMANDS.md#troubleshooting) for more solutions.

## Monitoring

### View Production Logs

```bash
# Stream logs in real-time
npx wrangler tail

# Pretty format
npx wrangler tail --format pretty

# Filter by status
npx wrangler tail --status error
```

### Check Worker Status

```bash
# View deployment info
npx wrangler deployments list

# View metrics
npx wrangler metrics
```

### Database Queries

```bash
# Check total files
npx wrangler d1 execute media-db --command "SELECT COUNT(*) FROM media"

# Recent uploads
npx wrangler d1 execute media-db --command "SELECT * FROM media ORDER BY created_at DESC LIMIT 10"
```

## Performance

- **Upload latency:** ~100-300ms (depends on file size)
- **List queries (cached):** ~10-50ms
- **List queries (uncached):** ~100-200ms
- **Delete operations:** ~50-150ms
- **CDN delivery:** Edge-cached globally

## Limits (Cloudflare Free Tier)

| Resource | Free Tier Limit |
|----------|----------------|
| Worker requests | 100,000/day |
| Worker CPU time | 10ms/request |
| R2 storage | 10 GB |
| R2 Class A ops | 1M/month |
| R2 Class B ops | 10M/month |
| D1 storage | 5 GB |
| D1 reads | 5M/day |
| KV storage | 1 GB |
| KV reads | 100,000/day |

[See current limits](https://developers.cloudflare.com/workers/platform/limits/)

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation:** [COMMANDS.md](./COMMANDS.md) | [ENV.md](./ENV.md)
- **Issues:** [GitHub Issues](https://github.com/your-username/media-service/issues)
- **Cloudflare Docs:** https://developers.cloudflare.com/workers/

---

**Built with:**
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [TypeScript](https://www.typescriptlang.org/)
