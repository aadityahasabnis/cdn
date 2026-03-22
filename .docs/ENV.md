# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables and configuration used in the Media Service.

## Table of Contents

- [Overview](#overview)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [Cloudflare Bindings](#cloudflare-bindings)
- [Local Development Setup](#local-development-setup)
- [Production Setup](#production-setup)
- [Security Best Practices](#security-best-practices)

---

## Overview

The Media Service uses environment variables for configuration and Cloudflare bindings for resources. Variables are configured differently for local development vs. production.

### Configuration Locations

| Environment | Secrets | Public Config | Bindings |
|-------------|---------|---------------|----------|
| **Local** | `.dev.vars` | `wrangler.jsonc` vars | `wrangler.jsonc` bindings |
| **Production** | `wrangler secret` | `wrangler.jsonc` vars | `wrangler.jsonc` bindings |

---

## Required Variables

###ADMIN_API_KEY

**Type:** Secret  
**Required:** Yes  
**Purpose:** API authentication key for protected endpoints (upload, delete)

**Local Setup:**
```bash
# Add to .dev.vars
ADMIN_API_KEY=your-admin-api-key
```

**Production Setup:**
```bash
npx wrangler secret put ADMIN_API_KEY
# Enter your production API key when prompted
```

**Usage:**
- Required for `POST /api/media/upload`
- Required for `DELETE /api/media/delete`
- Required for `DELETE /api/media/:id`
- Required for `POST /api/media/cache/clear`

**Example Request:**
```bash
curl -X POST https://your-worker.workers.dev/api/media/upload \
  -H "x-api-key: your-api-key-here" \
  -F "file=@image.jpg"
```

**Security Notes:**
- Use a strong, random key (minimum 32 characters recommended)
- Never commit this value to git
- Rotate regularly (every 90 days recommended)
- Use different keys for development vs. production
- Consider using a password manager to generate and store

**Generation Example:**
```bash
# Generate a secure random key
openssl rand -hex 32
# Output: 64-character hexadecimal string
```

---

### CDN_BASE_URL

**Type:** Public Environment Variable  
**Required:** Yes  
**Purpose:** Base URL for serving media files via CDN

**Local Value:**
```jsonc
// wrangler.jsonc
"vars": {
  "CDN_BASE_URL": "http://127.0.0.1:8787/cdn"
}
```

**Production Value:**
```jsonc
// wrangler.jsonc
"vars": {
  "CDN_BASE_URL": "https://cdn.aadityahasabnis.workers.dev/cdn"
}
```

**Can also override in `.dev.vars`:**
```bash
CDN_BASE_URL=http://127.0.0.1:8787/cdn
```

**Usage:**
- Prepended to all file keys to create public URLs
- Returned in upload responses
- Used in media list responses

**Example:**
- File key: `images/blog/cat.png`
- CDN URL: `https://cdn.aadityahasabnis.workers.dev/cdn/images/blog/cat.png`

**Notes:**
- Should NOT include trailing slash
- Must be accessible publicly for blog embedding
- Can use custom domain: `https://cdn.yourblog.com`

---

### MAX_UPLOAD_BYTES

**Type:** Public Environment Variable  
**Required:** Yes  
**Default:** `104857600` (100 MB)  
**Purpose:** Maximum file size allowed for uploads

**Configuration:**
```jsonc
// wrangler.jsonc
"vars": {
  "MAX_UPLOAD_BYTES": "104857600"
}
```

**Common Values:**
```javascript
10 MB  = "10485760"
50 MB  = "52428800"
100 MB = "104857600" // Default
200 MB = "209715200"
```

**Usage:**
- Validates file size in upload endpoint
- Prevents abuse and excessive storage costs
- Returns 413 error if exceeded

**Cloudflare Limits:**
- Workers have a 100 MB request body limit on paid plans
- Free plan has 10 MB limit
- Adjust this value based on your plan

**See:** https://developers.cloudflare.com/workers/platform/limits/

---

### RATE_LIMIT_PER_MIN

**Type:** Public Environment Variable  
**Required:** Yes  
**Default:** `30`  
**Purpose:** Maximum requests per minute per IP address

**Configuration:**
```jsonc
// wrangler.jsonc
"vars": {
  "RATE_LIMIT_PER_MIN": "30"
}
```

**Common Values:**
```javascript
Development: "100"   // Relaxed for testing
Production:  "30"    // Recommended
Strict:      "10"    // For sensitive operations
```

**Usage:**
- Applied to all endpoints via rate limit middleware
- Tracks requests per IP using D1 database
- Returns 429 error when limit exceeded
- Resets every minute (sliding window)

**Implementation:**
- Stored in `rate_limits` table in D1
- Keyed by IP address + time window
- Automatically cleaned up (old entries deleted)

**Notes:**
- Authenticated requests could have higher limits
- Consider separate limits for different endpoints
- Monitor rate limit hits in logs

---

### ENVIRONMENT

**Type:** Public Environment Variable  
**Required:** No  
**Default:** `production`  
**Purpose:** Identifies the environment for logging and error handling

**Configuration:**
```jsonc
// wrangler.jsonc
"vars": {
  "ENVIRONMENT": "production"
}
```

**Possible Values:**
- `development` - Local development
- `staging` - Staging environment
- `production` - Production environment

**Affects:**
- Error message verbosity (detailed in development)
- Logging behavior
- Cache behavior
- Request tracing

**Usage in Code:**
```typescript
if (c.env.ENVIRONMENT === "development") {
  // Show detailed error messages
  return c.json({ error: err.stack }, 500);
}
```

---

## Optional Variables

### ENABLE_REQUEST_LOGGING

**Type:** Public Environment Variable  
**Required:** No  
**Default:** `true` in development, `false` in production  
**Purpose:** Enable/disable request logging

**Configuration:**
```jsonc
"vars": {
  "ENABLE_REQUEST_LOGGING": "true"
}
```

**Usage:**
- Controls structured logging output
- Logs request start, completion, and errors
- Includes request ID for tracing

---

### ENABLE_METRICS

**Type:** Public Environment Variable  
**Required:** No  
**Default:** `true`  
**Purpose:** Enable/disable performance metrics collection

**Configuration:**
```jsonc
"vars": {
  "ENABLE_METRICS": "true"
}
```

**Usage:**
- Performance timing
- Cache hit/miss tracking
- Error rate monitoring

---

## Cloudflare Bindings

These are NOT environment variables but Cloudflare resource bindings configured in `wrangler.jsonc`.

### MEDIA_BUCKET

**Type:** R2 Bucket Binding  
**Required:** Yes  
**Purpose:** R2 bucket for storing uploaded media files

**Configuration:**
```jsonc
"r2_buckets": [
  {
    "binding": "MEDIA_BUCKET",
    "bucket_name": "media-storage"
  }
]
```

**Usage in Code:**
```typescript
const object = await c.env.MEDIA_BUCKET.put(fileKey, fileData);
```

**Setup:**
1. Create bucket: `npx wrangler r2 bucket create media-storage`
2. Add binding to wrangler.jsonc
3. Access via `c.env.MEDIA_BUCKET`

**Pricing:** See https://developers.cloudflare.com/r2/pricing/

---

### DB

**Type:** D1 Database Binding  
**Required:** Yes  
**Purpose:** D1 database for storing media metadata

**Configuration:**
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "media-db",
    "database_id": "48e8c552-c10b-4957-9a76-5f2191305b54"
  }
]
```

**Usage in Code:**
```typescript
const result = await c.env.DB.prepare("SELECT * FROM media").all();
```

**Setup:**
1. Create database: `npx wrangler d1 create media-db`
2. Note the database_id from output
3. Initialize schema: `npx wrangler d1 execute media-db --file=schema.sql`
4. Add binding to wrangler.jsonc

**Pricing:** D1 is free during beta

---

### MEDIA_CACHE

**Type:** KV Namespace Binding  
**Required:** Yes  
**Purpose:** KV namespace for caching gallery/list results

**Configuration:**
```jsonc
"kv_namespaces": [
  {
    "binding": "MEDIA_CACHE",
    "id": "1036265cf6254d9f8b344caaabcceb0c"
  }
]
```

**Usage in Code:**
```typescript
const cached = await c.env.MEDIA_CACHE.get("gallery:all:p1:l50", "json");
await c.env.MEDIA_CACHE.put(key, value, { expirationTtl: 300 });
```

**Setup:**
1. Create namespace: `npx wrangler kv:namespace create "MEDIA_CACHE"`
2. Note the ID from output
3. Add binding to wrangler.jsonc

**Cache Keys Format:**
- `gallery:all:p1:l50` - All files, page 1, limit 50
- `gallery:type:image:p1:l50` - Images only
- `gallery:folder:blog:p1:l50` - Blog folder only

**TTL:** 5 minutes (300 seconds)

**Pricing:** See https://developers.cloudflare.com/kv/platform/pricing/

---

## Local Development Setup

### Step 1: Create `.dev.vars` file

```bash
# Copy template
cp .dev.vars.example .dev.vars

# Edit with your values
nano .dev.vars
```

### Step 2: Configure `.dev.vars`

```bash
# .dev.vars
ADMIN_API_KEY=your-admin-api-key
CDN_BASE_URL=http://127.0.0.1:8787/cdn
```

### Step 3: Start development server

```bash
npm run dev
```

**Notes:**
- `.dev.vars` is git-ignored
- Values override wrangler.jsonc vars
- Restart server after changing values

---

## Production Setup

### Step 1: Set Secrets

```bash
# Set admin API key
npx wrangler secret put ADMIN_API_KEY
# Enter your production API key when prompted
```

### Step 2: Verify Configuration

```bash
# Check wrangler.jsonc has correct values
cat wrangler.jsonc

# Verify secrets are set
npx wrangler secret list
```

### Step 3: Deploy

```bash
npm run deploy
```

---

## Security Best Practices

### ✅ DO:

- Use `.dev.vars` for local secrets (git-ignored)
- Use `wrangler secret` for production secrets
- Rotate API keys regularly
- Use strong, random keys (32+ characters)
- Use different keys for dev/staging/production
- Monitor unauthorized access attempts
- Rate limit all endpoints

### ❌ DON'T:

- Commit secrets to git
- Share API keys via insecure channels
- Use weak or predictable keys
- Reuse keys across projects
- Log secret values
- Expose secrets in error messages

---

## Environment Variable Reference Table

| Variable | Type | Required | Default | Purpose |
|----------|------|----------|---------|---------|
| `ADMIN_API_KEY` | Secret | Yes | - | API authentication |
| `CDN_BASE_URL` | Public | Yes | - | CDN base URL |
| `MAX_UPLOAD_BYTES` | Public | Yes | `104857600` | Max file size |
| `RATE_LIMIT_PER_MIN` | Public | Yes | `30` | Rate limit |
| `ENVIRONMENT` | Public | No | `production` | Environment name |
| `ENABLE_REQUEST_LOGGING` | Public | No | `true`/`false` | Request logging |
| `ENABLE_METRICS` | Public | No | `true` | Metrics collection |

---

## Bindings Reference Table

| Binding | Type | Purpose | Configuration |
|---------|------|---------|---------------|
| `MEDIA_BUCKET` | R2 | File storage | `r2_buckets` |
| `DB` | D1 | Metadata | `d1_databases` |
| `MEDIA_CACHE` | KV | Caching | `kv_namespaces` |

---

## Troubleshooting

### Error: Missing required environment variables

**Cause:** Environment variable not set  
**Fix:** Check `.dev.vars` (local) or `wrangler secret list` (production)

### Error: ADMIN_API_KEY is not configured

**Cause:** Secret not set in production  
**Fix:** Run `npx wrangler secret put ADMIN_API_KEY`

### Error: Binding not found

**Cause:** Binding not configured in wrangler.jsonc  
**Fix:** Check `wrangler.jsonc` has correct binding configuration

---

## Next Steps

- **Setup:** Follow [README.md](./README.md) setup instructions
- **Commands:** See [COMMANDS.md](./COMMANDS.md) for all commands
- **Deploy:** Run `npm run deploy` or push to GitHub

---

## Support

- **Cloudflare Docs:** https://developers.cloudflare.com/workers/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/
- **Dashboard:** https://dash.cloudflare.com
