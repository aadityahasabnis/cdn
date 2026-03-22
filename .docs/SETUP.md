# Quick Setup Guide

## 1. Set Production API Key

**Option A: Using Cloudflare Dashboard**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → **cdn** → **Settings** → **Variables**
3. Under "Environment Variables", click **Add variable**
4. Add secret:
   - Name: `ADMIN_API_KEY`
   - Value: `your-secure-random-key-here` (use a password generator)
   - Type: **Secret** (encrypted)
5. Click **Save**

**Option B: Using Wrangler CLI**
```bash
cd media-service
npx wrangler secret put ADMIN_API_KEY
# Enter your desired API key when prompted
```

## 2. Update API_USAGE.md

Replace all `https://your-worker.workers.dev` with your actual URL:
```
https://cdn.aadityahasabnis.workers.dev
```

## 3. Access the Admin UI

Visit: **https://cdn.aadityahasabnis.workers.dev/**

### First Time Setup:
1. **API Base URL** will auto-fill (should be correct)
2. **API Key** - Enter the `ADMIN_API_KEY` you just created
3. The key will be saved in your browser for future visits

## 4. Test Upload

1. Click the upload area or drag a file
2. Set folder (optional): `test`
3. Add tags (optional): `demo,first-upload`
4. Click **Upload File**
5. You should see "✅ File uploaded successfully!"

## 5. Test the Gallery

- Files should appear in the gallery grid
- Click on a file to view details
- Click "📋 Copy URL" to get the public CDN link
- Click "🗑️ Delete" to remove (will ask for confirmation)

## 6. Use in Your Project

### Get the Public URL

After uploading, you'll get a response like:
```json
{
  "public_url": "https://cdn.aadityahasabnis.workers.dev/cdn/test/image-abc123.jpg"
}
```

### Use Directly in HTML

```html
<img src="https://cdn.aadityahasabnis.workers.dev/cdn/test/image-abc123.jpg" alt="My Image">
```

### Integration Examples

See **[API_USAGE.md](./API_USAGE.md)** for:
- JavaScript/TypeScript examples
- React components
- Python integration
- All API endpoints

## 7. Check Stats

Visit: **https://cdn.aadityahasabnis.workers.dev/api/media/stats**

You'll see:
```json
{
  "success": true,
  "total_files": 5,
  "total_size": 1234567,
  "by_type": {
    "image": 3,
    "video": 1,
    "file": 1
  },
  "by_folder": {
    "test": 2,
    "blog": 3
  }
}
```

## 8. List Files

Visit: **https://cdn.aadityahasabnis.workers.dev/api/media/list**

Or with filters:
```
https://cdn.aadityahasabnis.workers.dev/api/media/list?folder=test&type=image
```

## Common First-Time Issues

### ❌ Can't delete files
→ Make sure you entered the correct `ADMIN_API_KEY` in the UI

### ❌ Upload fails with 401
→ Check your API key matches configured `ADMIN_API_KEY`

### ❌ Gallery shows 0 files but I uploaded
→ Clear cache: `POST /api/media/cache/clear` with API key header

### ❌ Database error
→ Run: `npx wrangler d1 execute media-db --file=schema.sql`

## Security Notes

✅ **Never commit** `.dev.vars` or expose your `ADMIN_API_KEY`  
✅ **Public endpoints** (list, stats, CDN) don't need auth  
✅ **Protected endpoints** (upload, delete) require `x-api-key` header  
✅ **Files are public** once uploaded - anyone with the URL can access them  

## Next Steps

- Read **[API_USAGE.md](./API_USAGE.md)** for integration examples
- See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** if you encounter issues
- Check worker logs: `npx wrangler tail`

## Production Checklist

- [ ] Set strong `ADMIN_API_KEY` secret
- [ ] Test upload/delete in UI
- [ ] Verify files are accessible via CDN URLs
- [ ] Check stats endpoint works
- [ ] Test API integration in your app
- [ ] Monitor worker logs for errors
- [ ] Set up custom domain (optional)

---

**Your media service is ready! 🚀**

Access it at: **https://cdn.aadityahasabnis.workers.dev/**
