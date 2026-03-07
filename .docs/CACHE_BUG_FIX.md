# Cache Bug Fix - Images Not Appearing After Upload

## The Problem

**Symptom:**
- Upload shows "File uploaded successfully!" ✅
- Database shows correct file count in stats (6 files, 4 images) ✅
- **Gallery still shows old files (2 files)** ❌
- New images don't appear in gallery after upload ❌

## Root Cause Analysis

### What the Logs Show

```
Upload succeeded → Cache invalidated (100 keys deleted)
↓
User refreshes gallery
↓
List request → CACHE HIT ❌ (returns old data with 2 files)
↓
Gallery shows old data even though database has 6 files
```

### The Bug

**Cache invalidation is missing the specific cache key the UI uses!**

**UI requests:** `gallery:all:p1:l12` (limit=12 from dropdown)  
**Cache invalidates:** `gallery:all:p1:l10`, `gallery:all:p1:l20`, `gallery:all:p1:l25`, `gallery:all:p1:l50`, `gallery:all:p1:l100`

**Missing:** `l12`, `l24`, `l48` ← **These limits are used by the UI but NOT invalidated!**

### Why This Happens

**File:** `src/constants/index.ts`

```typescript
INVALIDATION_LIMITS: [10, 20, 25, 50, 100]  // ❌ Missing 12, 24, 48
```

**File:** `src/ui/testUI.ts` (line 661-666)

```html
<select id="itemsPerPage">
    <option value="12">12</option>    <!-- ← UI uses this by default -->
    <option value="24">24</option>    <!-- ← Also used -->
    <option value="48">48</option>    <!-- ← Also used -->
    <option value="100">100</option>
</select>
```

**Result:**
1. User uploads file with "12 items per page" selected
2. Cache invalidates `gallery:all:p1:l50` (and other limits)
3. But NOT `gallery:all:p1:l12` ← **Cache key still exists!**
4. Next list request gets cache hit with OLD data
5. Gallery shows old files, not the newly uploaded ones

## The Fix

**Add UI limits to the invalidation list:**

```typescript
// Before
INVALIDATION_LIMITS: [10, 20, 25, 50, 100]

// After
INVALIDATION_LIMITS: [10, 12, 20, 24, 25, 48, 50, 100]
//                        ↑   ↑       ↑  ← Added these
```

Now when cache is invalidated after upload, it will also clear:
- `gallery:all:p1:l12` ✅
- `gallery:all:p1:l24` ✅
- `gallery:all:p1:l48` ✅

## Verification Steps

### Before Fix:
1. Upload image with "12 items per page" selected
2. Cache invalidates 100 keys (missing l12)
3. Gallery refresh → Cache hit → Shows old data ❌

### After Fix:
1. Upload image with "12 items per page" selected
2. Cache invalidates 160 keys (includes l12, l24, l48)
3. Gallery refresh → Cache miss → Fetches from DB → Shows new images ✅

## Test Commands

```bash
# Deploy the fix
npm run typecheck && npx wrangler deploy

# Test upload
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_KEY" \
  -F "file=@test.jpg"

# Check if it appears in gallery (should be cache miss now)
curl "https://cdn.aadityahasabnis.workers.dev/api/media/list?limit=12"

# Verify stats match gallery count
curl https://cdn.aadityahasabnis.workers.dev/api/media/stats
```

## Files Changed

- `src/constants/index.ts` - Added 12, 24, 48 to `INVALIDATION_LIMITS`

## Impact

**Cache keys now invalidated:** 
- Before: 5 limits × 5 pages × 4 patterns = **100 keys**
- After: 8 limits × 5 pages × 4 patterns = **160 keys**

This is still very efficient and ensures all UI-used cache keys are properly cleared.

## Related Issues

This same bug would affect:
- Any limit value not in the invalidation list
- Folder-specific caching with non-standard limits
- Type-specific caching with non-standard limits

The fix ensures all dropdown values in the UI are covered.

---

**Status:** Ready to deploy

**Expected Result:** After deployment, new uploads will immediately appear in the gallery, regardless of the "items per page" setting.
