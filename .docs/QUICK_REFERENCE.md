# Media Service - Quick Reference Card

## 📍 Your Live URLs

```
Admin UI:  https://cdn.aadityahasabnis.workers.dev/
API Base:  https://cdn.aadityahasabnis.workers.dev/api
CDN:       https://cdn.aadityahasabnis.workers.dev/cdn/
```

## 🔑 API Key Setup (One-Time)

```bash
npx wrangler secret put ADMIN_API_KEY
# Enter a strong password when prompted
```

Then use it in:
- UI: Enter in "API Key" field
- API: Send as `x-api-key` header

## 📤 Upload a File

```bash
curl -X POST https://cdn.aadityahasabnis.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_KEY" \
  -F "file=@image.jpg" \
  -F "folder=blog"
```

**Response:**
```json
{
  "public_url": "https://cdn.aadityahasabnis.workers.dev/cdn/blog/image-xyz.jpg"
}
```

## 📋 List Files

```bash
# All files
curl https://cdn.aadityahasabnis.workers.dev/api/media/list

# Filter by folder
curl https://cdn.aadityahasabnis.workers.dev/api/media/list?folder=blog

# Filter by type
curl https://cdn.aadityahasabnis.workers.dev/api/media/list?type=image
```

## 🗑️ Delete a File

```bash
curl -X DELETE https://cdn.aadityahasabnis.workers.dev/api/media/delete \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_key": "blog/image-xyz.jpg"}'
```

## 📁 Get Folders

```bash
curl https://cdn.aadityahasabnis.workers.dev/api/media/folders
```

## 📊 Get Stats

```bash
curl https://cdn.aadityahasabnis.workers.dev/api/media/stats
```

## 🔧 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't delete | Set API key: [HOW_TO_DELETE.md](./HOW_TO_DELETE.md) |
| Upload fails | Check API key is correct |
| No files showing | Clear cache: `POST /api/media/cache/clear` |
| Database error | Run: `npx wrangler d1 execute media-db --file=schema.sql` |

## 💻 Use in Your Code

### JavaScript/React

```javascript
// Upload
const upload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'blog');
  
  const res = await fetch('https://cdn.aadityahasabnis.workers.dev/api/media/upload', {
    method: 'POST',
    headers: { 'x-api-key': 'YOUR_KEY' },
    body: formData
  });
  
  const { public_url } = await res.json();
  return public_url; // Use in <img src={public_url} />
};

// List
const getImages = async () => {
  const res = await fetch('https://cdn.aadityahasabnis.workers.dev/api/media/list?type=image');
  const { files } = await res.json();
  return files; // Array of image objects
};
```

### Python

```python
import requests

# Upload
files = {'file': open('image.jpg', 'rb')}
data = {'folder': 'blog'}
headers = {'x-api-key': 'YOUR_KEY'}

r = requests.post(
    'https://cdn.aadityahasabnis.workers.dev/api/media/upload',
    files=files,
    data=data,
    headers=headers
)

url = r.json()['public_url']  # Use this URL

# List
r = requests.get('https://cdn.aadityahasabnis.workers.dev/api/media/list?folder=blog')
files = r.json()['files']
```

## 📚 Full Docs

- **Setup:** [SETUP.md](./SETUP.md)
- **API Usage:** [API_USAGE.md](./API_USAGE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Delete Fix:** [HOW_TO_DELETE.md](./HOW_TO_DELETE.md)

## 🚀 Deploy Changes

```bash
npm run typecheck  # Verify types
npx wrangler deploy  # Deploy to production
npx wrangler tail  # View logs
```

## 🎯 Common Use Cases

| Use Case | Endpoint | Query |
|----------|----------|-------|
| Blog post images | `/api/media/list` | `?folder=blog&type=image` |
| Product photos | `/api/media/list` | `?folder=products&type=image` |
| User avatars | `/api/media/list` | `?folder=avatars&type=image` |
| Video content | `/api/media/list` | `?type=video` |
| All files in folder | `/api/media/list` | `?folder=downloads` |

## ⚙️ Local Development

```bash
npm run dev  # Start local server
# Visit: http://127.0.0.1:8787
# API Key: set to your local ADMIN_API_KEY in .dev.vars
```

---

**Need Help?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or view logs with `npx wrangler tail`
