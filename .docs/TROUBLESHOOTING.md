# Troubleshooting Guide

## Can't Delete Files from UI

### Problem
Clicking "Delete" button shows error: "Authentication failed" or "Invalid API key"

### Solution
1. **Check your API key:**
   - The default `test-key-123` only works for LOCAL development
   - For production, you need your actual `ADMIN_API_KEY`

2. **Find your production API key:**
   ```bash
   # View secrets in Cloudflare Dashboard
   Cloudflare Dashboard → Workers & Pages → cdn → Settings → Variables
   ```

3. **Set a new API key if needed:**
   ```bash
   # Using wrangler CLI
   npx wrangler secret put ADMIN_API_KEY
   # Enter your desired key when prompted
   ```

4. **Use the key in the UI:**
   - Visit `https://cdn.aadityahasabnis.workers.dev/`
   - Enter your API key in the "API Key" field at the top
   - It will be saved to localStorage for future visits
   - Now upload/delete should work

## Wrong Worker URL After Rename

### Problem
Changed worker name but UI still shows old URL

### Solution
The UI auto-detects from `window.location.origin`. Just visit the new URL:
```
https://NEW-WORKER-NAME.workers.dev/
```

## Upload Fails with "Payload Too Large"

### Problem
File upload rejected with 413 error

### Solution
```bash
# Check max size (default 100MB)
# In wrangler.jsonc:
"MAX_UPLOAD_BYTES": "104857600"  # 100MB

# Increase if needed (up to Cloudflare limits)
"MAX_UPLOAD_BYTES": "524288000"  # 500MB
```

Then redeploy:
```bash
npx wrangler deploy
```

## Files Not Showing in Gallery

### Problem
Uploaded files but gallery shows "No files found"

### Solution

**Check database:**
```bash
# Query the database
npx wrangler d1 execute media-db --command "SELECT COUNT(*) FROM media_files"
```

**Clear cache:**
```bash
# Visit:
# POST https://cdn.aadityahasabnis.workers.dev/api/media/cache/clear
# With x-api-key header

# Or use curl:
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/cache/clear \
  -H "x-api-key: YOUR_API_KEY"
```

## CORS Errors

### Problem
Browser shows CORS error when accessing from another domain

### Solution
CORS is already enabled for all origins. If still seeing errors:

1. Check browser console for actual error
2. Verify you're using the correct HTTP method
3. For authenticated endpoints, ensure `x-api-key` header is sent

## Rate Limit Exceeded

### Problem
"429 Rate limit exceeded" error

### Solution
```bash
# Increase limit in wrangler.jsonc:
"RATE_LIMIT_PER_MIN": "100"  # Default is 30

# Then redeploy
npx wrangler deploy
```

## Database Not Initialized

### Problem
"D1_ERROR" or "no such table: media_files"

### Solution
```bash
# Initialize database
npx wrangler d1 execute media-db --file=schema.sql

# Verify tables exist
npx wrangler d1 execute media-db --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## Local Development Issues

### Problem
`npm run dev` fails or shows errors

### Solution

**1. Check Node.js version:**
```bash
node --version  # Should be 18+
```

**2. Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**3. Check .dev.vars file exists:**
```bash
# Should contain:
ADMIN_API_KEY=test-key-123
CDN_BASE_URL=http://127.0.0.1:8787/cdn
```

**4. Initialize local D1:**
```bash
npx wrangler d1 execute media-db --local --file=schema.sql
```

## View Logs

### Production Logs
```bash
# Real-time logs
npx wrangler tail

# Or view in dashboard:
Cloudflare Dashboard → Workers & Pages → cdn → Logs
```

### Local Logs
```bash
# Start dev server with verbose logging
npx wrangler dev --log-level debug
```

## Check Worker Status

```bash
# Get deployment info
npx wrangler deployments list

# View current bindings
npx wrangler types
```

## Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `Authentication failed` | Invalid/missing API key | Set correct `ADMIN_API_KEY` |
| `File not found` | File doesn't exist in R2 | Check file_key is correct |
| `MIME type not allowed` | Unsupported file type | Check ALLOWED_MIME_TYPES in constants |
| `Folder name invalid` | Bad folder name | Use alphanumeric + hyphens only |
| `Rate limit exceeded` | Too many requests | Wait 1 minute or increase limit |
| `Configuration error` | Missing env vars | Check wrangler.jsonc bindings |

## Reset Everything

If all else fails:

```bash
# 1. Clear D1 database
npx wrangler d1 execute media-db --command "DROP TABLE IF EXISTS media_files"
npx wrangler d1 execute media-db --file=schema.sql

# 2. Clear R2 bucket (CAREFUL - deletes all files!)
npx wrangler r2 object delete media-storage --file=./all-files.txt

# 3. Clear KV cache
# Use UI: POST /api/media/cache/clear with API key

# 4. Redeploy
npx wrangler deploy
```

## Get Help

1. **Check worker logs** for detailed error messages
2. **Test API endpoints** with curl to isolate UI vs API issues
3. **Verify environment variables** in Cloudflare dashboard
4. **Check Cloudflare status** at status.cloudflare.com
