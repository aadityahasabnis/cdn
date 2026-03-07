# Commands Reference

This document provides a comprehensive reference for all commands used in the Media Service project.

## Table of Contents

- [Development Commands](#development-commands)
- [Deployment Commands](#deployment-commands)
- [Database Commands](#database-commands)
- [Testing Commands](#testing-commands)
- [Utility Commands](#utility-commands)

---

## Development Commands

### Start Local Development Server

```bash
npm run dev
```

**Purpose:** Starts the local Wrangler development server  
**Port:** http://127.0.0.1:8787  
**Features:**
- Hot reload on file changes
- Local R2, D1, and KV emulation
- Uses `.dev.vars` for secrets
- Connects to remote resources by default

**Environment:**
- Uses bindings from `wrangler.jsonc`
- Loads secrets from `.dev.vars`
- Local D1 database in `.wrangler/state`

---

### Start Development Server (Remote Mode)

```bash
npx wrangler dev --remote
```

**Purpose:** Run development server using remote Cloudflare resources  
**Use when:** Testing against production data or when local emulation has issues  
**Note:** All requests hit actual Cloudflare infrastructure

---

## Deployment Commands

### Deploy to Production

```bash
npm run deploy
```
or
```bash
npx wrangler deploy
```

**Purpose:** Deploy worker to Cloudflare  
**Target:** Production environment  
**URL:** https://cdn.aadityahasabnis.workers.dev  
**Requirements:**
- Valid Cloudflare API token
- Proper wrangler.jsonc configuration
- All secrets set via `wrangler secret put`

**Pre-deployment checklist:**
- [ ] Run `npm run type-check` 
- [ ] Test locally with `npm run dev`
- [ ] Verify all environment variables are set
- [ ] Check database migrations are applied

---

### Deploy with Specific Environment

```bash
npx wrangler deploy --env staging
```

**Purpose:** Deploy to a specific environment (requires environment config in wrangler.jsonc)  
**Use when:** Testing in staging before production

---

## Database Commands

### Initialize Local Database

```bash
npx wrangler d1 execute media-db --local --file=./schema.sql
```

**Purpose:** Create tables in local D1 database  
**Location:** `.wrangler/state/v3/d1`  
**Run:** Once per local environment setup  
**File:** `schema.sql` contains table definitions

---

### Initialize Production Database

```bash
npx wrangler d1 execute media-db --remote --file=./schema.sql
```

**Purpose:** Create tables in production D1 database  
**⚠️ Warning:** Only run once! Will fail if tables exist  
**Database ID:** `48e8c552-c10b-4957-9a76-5f2191305b54`

---

### Query Local Database

```bash
npx wrangler d1 execute media-db --local --command="SELECT * FROM media LIMIT 10"
```

**Purpose:** Run SQL queries against local database  
**Use for:** Debugging, data inspection, testing

**Examples:**
```bash
# Count all media files
npx wrangler d1 execute media-db --local --command="SELECT COUNT(*) FROM media"

# Get recent uploads
npx wrangler d1 execute media-db --local --command="SELECT * FROM media ORDER BY uploaded_at DESC LIMIT 5"

# Check rate limits
npx wrangler d1 execute media-db --local --command="SELECT * FROM rate_limits"
```

---

### Query Production Database

```bash
npx wrangler d1 execute media-db --remote --command="SELECT COUNT(*) FROM media"
```

**Purpose:** Query production database  
**⚠️ Caution:** Read-only queries recommended  
**Use for:** Production debugging, analytics

---

### Backup Production Database

```bash
npx wrangler d1 export media-db --remote --output=backup.sql
```

**Purpose:** Export production database to SQL file  
**Frequency:** Before major changes or weekly  
**Location:** Save backups securely

---

## Testing Commands

### Type Check

```bash
npm run type-check
```
or
```bash
npx tsc --noEmit
```

**Purpose:** Verify TypeScript types without building  
**Run:** Before committing, in CI/CD  
**Checks:** Type errors, interface mismatches, missing imports

---

### Generate TypeScript Types

```bash
npx wrangler types
```

**Purpose:** Generate TypeScript types from wrangler.jsonc  
**Output:** `worker-configuration.d.ts`  
**Run:** After changing bindings in wrangler.jsonc  
**Generated types:**
- Environment bindings
- KV namespaces
- R2 buckets
- D1 databases

---

### Test API Endpoints

```bash
# Upload test file
curl -X POST http://127.0.0.1:8787/api/media/upload \
  -H "x-api-key: test-key-123" \
  -F "file=@test-image.jpg" \
  -F "folder=test" \
  -F "tags=test,demo"

# List files
curl http://127.0.0.1:8787/api/media/list

# Get stats
curl http://127.0.0.1:8787/api/media/stats

# Delete file
curl -X DELETE http://127.0.0.1:8787/api/media/delete \
  -H "x-api-key: test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"file_key":"images/test/1234567890-abc123-test.jpg"}'
```

---

## Utility Commands

### Manage Secrets (Local Development)

**Edit `.dev.vars` file:**
```bash
# .dev.vars
ADMIN_API_KEY=your-local-api-key
CDN_BASE_URL=http://127.0.0.1:8787/cdn
```

**Purpose:** Configure secrets for local development  
**File:** `.dev.vars` (git-ignored)  
**Reload:** Restart `npm run dev` after changes

---

### Manage Secrets (Production)

```bash
# Set a secret
npx wrangler secret put ADMIN_API_KEY
# Enter value when prompted

# List secrets (names only, not values)
npx wrangler secret list

# Delete a secret
npx wrangler secret delete ADMIN_API_KEY
```

**Purpose:** Manage encrypted secrets in production  
**Security:** Values never shown after setting  
**Required secrets:**
- `ADMIN_API_KEY` - API authentication key

---

### View Worker Logs

```bash
npx wrangler tail
```

**Purpose:** Stream real-time logs from production worker  
**Shows:**
- Request logs
- console.log() output
- Errors and stack traces
- Performance metrics

**Filter logs:**
```bash
# Only show errors
npx wrangler tail --status error

# Only specific methods
npx wrangler tail --method POST

# Search logs
npx wrangler tail --search "upload"
```

---

### View Worker Metrics

```bash
npx wrangler metrics
```

**Purpose:** View analytics and metrics  
**Shows:**
- Request count
- Error rate
- CPU time
- Response times

**Alternative:** Cloudflare Dashboard → Workers & Pages → media-service → Metrics

---

### Clear KV Cache

```bash
# Via API
curl -X POST http://127.0.0.1:8787/api/media/cache/clear \
  -H "x-api-key: test-key-123"
```

**Purpose:** Invalidate all cached gallery results  
**Use when:** Data inconsistency, testing cache behavior  
**Note:** Cache rebuilds automatically on next request

---

### Inspect R2 Bucket

```bash
# List objects
npx wrangler r2 object list media-storage

# Get object info
npx wrangler r2 object get media-storage/images/test/file.jpg

# Delete object
npx wrangler r2 object delete media-storage/images/test/file.jpg
```

**Purpose:** Directly manage R2 bucket contents  
**Use for:** Debugging, cleanup, inspection

---

### List KV Keys

```bash
npx wrangler kv:key list --namespace-id=1036265cf6254d9f8b344caaabcceb0c
```

**Purpose:** View all keys in KV namespace  
**Shows:** Cache keys, timestamps  
**Namespace ID:** From wrangler.jsonc

---

### Get KV Value

```bash
npx wrangler kv:key get "gallery:all:p1:l50" --namespace-id=1036265cf6254d9f8b344caaabcceb0c
```

**Purpose:** Inspect cached values  
**Use for:** Debugging cache behavior

---

## CI/CD Commands

### Trigger GitHub Actions Deployment

```bash
git add .
git commit -m "Deploy: description of changes"
git push origin main
```

**Purpose:** Trigger automatic deployment via GitHub Actions  
**Workflow:** `.github/workflows/deploy.yml`  
**Required secrets:**
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

### Manual Workflow Trigger

**Via GitHub UI:**
1. Go to Actions tab
2. Select "Deploy to Cloudflare Workers"
3. Click "Run workflow"
4. Select branch and run

**Via GitHub CLI:**
```bash
gh workflow run deploy.yml
```

---

## Troubleshooting Commands

### Check Configuration

```bash
npx wrangler whoami
```
**Purpose:** Verify Cloudflare authentication  
**Shows:** Account ID, email, API token status

---

### Validate wrangler.jsonc

```bash
npx wrangler deploy --dry-run
```
**Purpose:** Test deployment without actually deploying  
**Checks:** Configuration syntax, bindings, compatibility

---

### Clear Wrangler Cache

```bash
rm -rf .wrangler
npx wrangler dev
```
**Purpose:** Fix local development issues  
**Use when:** Weird errors, stale data, broken local state

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start local server |
| `npm run deploy` | Deploy to production |
| `npm run type-check` | Check TypeScript |
| `npx wrangler types` | Generate types |
| `npx wrangler tail` | View live logs |
| `npx wrangler d1 execute` | Run SQL query |
| `npx wrangler secret put` | Set production secret |

---

## Next Steps

- **Local Development:** Run `npm run dev` and visit http://127.0.0.1:8787
- **Deploy:** Run `npm run deploy` or push to GitHub
- **Monitor:** Use `npx wrangler tail` to watch logs
- **Documentation:** See [README.md](./README.md) and [ENV.md](./ENV.md)
