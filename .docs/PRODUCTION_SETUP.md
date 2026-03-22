# Production Database Empty - Setup Guide

## What Happened

You were testing on **local development** (`npm run dev`) which uses a LOCAL database.  
But **production** (`https://cdn.aadityahasabnis.workers.dev`) uses a SEPARATE remote database.

### The Confusion:

| Environment | Database | Status |
|-------------|----------|--------|
| **Local Dev** | Local D1 (on your computer) | ✅ Has 3+ files |
| **Production** | Remote D1 (on Cloudflare) | ❌ Empty (just initialized) |

The production gallery showed files because it was displaying **old cached data**, not real database data.

## What Was Done

✅ **Production database initialized** - Schema created (media and rate_limits tables)  
❌ **Production database is empty** - No files uploaded yet  
⚠️ **Cache still has old data** - Needs to be cleared  

## Next Steps

### Step 1: Set Production API Key

You need to create a production API key first:

```bash
cd media-service
npx wrangler secret put ADMIN_API_KEY
```

When prompted, enter a **strong password**. Example:
```
sk_prod_9f2a8b4c6d1e3f7a5c2d8e9f1a3b6c4d
```

Save this key somewhere safe (password manager).

### Step 2: Clear Production Cache

```bash
# Replace YOUR_API_KEY with the key you just created
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/cache/clear \
  -H "x-api-key: YOUR_API_KEY"
```

Expected response:
```json
{
  "success": true,
  "message": "Cleared X cache entries",
  "deleted": X
}
```

### Step 3: Verify Production is Clean

Visit: https://cdn.aadityahasabnis.workers.dev/

You should see:
- ✅ **Stats:** 0 Total Files, 0 Images, 0 Videos
- ✅ **Gallery:** "No files found" message
- ✅ Everything consistent (no ghost files)

### Step 4: Upload Files to Production

**Option A: Use the UI**

1. Visit https://cdn.aadityahasabnis.workers.dev/
2. Enter your production API key
3. Upload files using the UI
4. Files will now appear correctly

**Option B: Use API**

```bash
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@yourimage.jpg" \
  -F "folder=blog"
```

## Understanding the Two Environments

### Local Development (`npm run dev`)

**URL:** http://127.0.0.1:8787  
**Database:** Local D1 (stored on your computer)  
**API Key:** `ADMIN_API_KEY` from Cloudflare secret  
**Purpose:** Testing without affecting production  

**Files uploaded here:**
- ✅ Stored in local database
- ✅ Available at http://127.0.0.1:8787
- ❌ NOT on production
- ❌ Lost when you clear local wrangler cache

### Production (deployed)

**URL:** https://cdn.aadityahasabnis.workers.dev  
**Database:** Remote D1 (on Cloudflare servers)  
**API Key:** Your production secret (set with `wrangler secret put`)  
**Purpose:** Real live service  

**Files uploaded here:**
- ✅ Stored in production database
- ✅ Available at https://cdn.aadityahasabnis.workers.dev
- ✅ Persistent (not lost)
- ✅ Public and shareable

## Recommended Workflow

**For testing/development:**
```bash
npm run dev
# Upload test files locally
# Test features
# No risk to production
```

**For production use:**
```bash
# 1. Ensure changes work in local dev
npm run dev
# Test thoroughly

# 2. Deploy to production
npx wrangler deploy

# 3. Upload files via production URL
# Visit https://cdn.aadityahasabnis.workers.dev/
```

## Current Status

✅ **Local dev** - Has files, works correctly  
✅ **Production** - Database initialized, ready for files  
⚠️ **Production cache** - Needs clearing (see Step 2 above)  
⚠️ **Production API key** - Needs setting (see Step 1 above)  

## Quick Commands Summary

```bash
# 1. Set production API key
npx wrangler secret put ADMIN_API_KEY

# 2. Clear production cache (use your key)
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/cache/clear \
  -H "x-api-key: YOUR_API_KEY"

# 3. Check production stats
curl https://cdn.aadityahasabnis.workers.dev/api/media/stats

# 4. Upload to production
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@image.jpg"
```

---

**Once you complete Steps 1-2, production will be clean and ready to use!**
