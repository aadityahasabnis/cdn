# Media Service API - Quick Reference

Simple CDN service for uploading and managing images, videos, and files. Built on Cloudflare Workers.

## Base URL

```
https://your-worker.workers.dev
```

## Authentication

Add your API key to requests that require auth:

```bash
x-api-key: your-admin-api-key-here
```

## Quick Start

### 1. Upload a File

```bash
curl -X POST https://your-worker.workers.dev/api/media/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@image.jpg" \
  -F "folder=blog" \
  -F "tags=featured,homepage"
```

**Response:**
```json
{
  "success": true,
  "file_key": "blog/image-abc123.jpg",
  "public_url": "https://cdn.your-worker.workers.dev/cdn/blog/image-abc123.jpg",
  "mime_type": "image/jpeg",
  "size": 245678
}
```

**Use the `public_url` directly in your HTML:**
```html
<img src="https://cdn.your-worker.workers.dev/cdn/blog/image-abc123.jpg" />
```

### 2. List All Files

```bash
curl https://your-worker.workers.dev/api/media/list
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "file_key": "blog/image-abc123.jpg",
      "public_url": "https://cdn.your-worker.workers.dev/cdn/blog/image-abc123.jpg",
      "file_type": "image",
      "mime_type": "image/jpeg",
      "size": 245678,
      "folder": "blog",
      "tags": ["featured", "homepage"],
      "uploaded_at": "2026-03-08T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### 3. Filter by Folder

```bash
curl "https://your-worker.workers.dev/api/media/list?folder=blog"
```

### 4. Filter by Type

```bash
# Images only
curl "https://your-worker.workers.dev/api/media/list?type=image"

# Videos only
curl "https://your-worker.workers.dev/api/media/list?type=video"

# Files only (PDFs, docs, etc.)
curl "https://your-worker.workers.dev/api/media/list?type=file"
```

### 5. Pagination

```bash
curl "https://your-worker.workers.dev/api/media/list?page=2&limit=20"
```

### 6. Get All Folders

```bash
curl https://your-worker.workers.dev/api/media/folders
```

**Response:**
```json
{
  "success": true,
  "folders": ["blog", "products", "avatars", "root"]
}
```

### 7. Delete a File

```bash
curl -X DELETE https://your-worker.workers.dev/api/media/delete \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"file_key": "blog/image-abc123.jpg"}'
```

## Usage in Your Project

### JavaScript/TypeScript

```typescript
const API_KEY = 'your-api-key';
const BASE_URL = 'https://your-worker.workers.dev';

// Upload file
async function uploadFile(file: File, folder: string = 'root') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  
  const res = await fetch(`${BASE_URL}/api/media/upload`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: formData
  });
  
  const data = await res.json();
  return data.public_url; // Use this URL directly
}

// List files in a folder
async function getFiles(folder: string) {
  const res = await fetch(`${BASE_URL}/api/media/list?folder=${folder}`);
  const data = await res.json();
  return data.files;
}

// Get all images
async function getImages() {
  const res = await fetch(`${BASE_URL}/api/media/list?type=image`);
  const data = await res.json();
  return data.files;
}
```

### React Example

```tsx
import { useState } from 'react';

function ImageUploader() {
  const [url, setUrl] = useState('');
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'blog');
    
    const res = await fetch('https://your-worker.workers.dev/api/media/upload', {
      method: 'POST',
      headers: { 'x-api-key': 'YOUR_API_KEY' },
      body: formData
    });
    
    const data = await res.json();
    setUrl(data.public_url);
  };
  
  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {url && <img src={url} alt="Uploaded" />}
    </div>
  );
}

function ImageGallery({ folder }: { folder: string }) {
  const [images, setImages] = useState([]);
  
  useEffect(() => {
    fetch(`https://your-worker.workers.dev/api/media/list?folder=${folder}&type=image`)
      .then(res => res.json())
      .then(data => setImages(data.files));
  }, [folder]);
  
  return (
    <div>
      {images.map(img => (
        <img key={img.file_key} src={img.public_url} alt={img.file_key} />
      ))}
    </div>
  );
}
```

### Python

```python
import requests

API_KEY = 'your-api-key'
BASE_URL = 'https://your-worker.workers.dev'

# Upload file
def upload_file(file_path, folder='root'):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        data = {'folder': folder}
        headers = {'x-api-key': API_KEY}
        
        res = requests.post(
            f'{BASE_URL}/api/media/upload',
            files=files,
            data=data,
            headers=headers
        )
        
        return res.json()['public_url']

# List files
def get_files(folder=None, file_type=None):
    params = {}
    if folder: params['folder'] = folder
    if file_type: params['type'] = file_type
    
    res = requests.get(f'{BASE_URL}/api/media/list', params=params)
    return res.json()['files']

# Usage
url = upload_file('image.jpg', folder='blog')
images = get_files(folder='blog', file_type='image')
```

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/media/upload` | ✅ Required | Upload a file |
| `GET` | `/api/media/list` | ❌ Public | List all files with filters |
| `DELETE` | `/api/media/delete` | ✅ Required | Delete a file by key |
| `GET` | `/api/media/folders` | ❌ Public | Get all folder names |
| `GET` | `/api/media/stats` | ❌ Public | Get usage statistics |
| `GET` | `/cdn/*` | ❌ Public | Serve files directly |

## Upload Options

```bash
# Basic upload
-F "file=@image.jpg"

# With folder
-F "file=@image.jpg" -F "folder=products"

# With tags
-F "file=@image.jpg" -F "tags=featured,sale,new"

# Force type (auto-detected by default)
-F "file=@document.pdf" -F "type=file"
```

## Query Parameters (List Endpoint)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `folder` | string | - | Filter by folder name |
| `type` | `image\|video\|file` | - | Filter by media type |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

## File Types

- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`
- **Videos**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`
- **Files**: Everything else (PDFs, documents, etc.)

## Folder Organization

```
root/                  # Default folder
├── blog/             # Blog images
├── products/         # Product photos
├── avatars/          # User avatars
└── videos/           # Video content
```

Use folders to organize content by section, category, or purpose.

## Rate Limits

- **30 requests per minute** (configurable)
- Applies to all authenticated endpoints

## File Size Limits

- **Max upload size**: 100 MB (configurable via `MAX_UPLOAD_BYTES`)

## CORS

All endpoints support CORS - use from any domain/origin.

## Test UI

Visit the root URL in your browser to access the web-based test interface:
```
https://your-worker.workers.dev/
```

## Common Use Cases

### Blog CMS
```javascript
// Upload blog post image
const url = await uploadFile(imageFile, 'blog-posts');

// Get all blog images
const images = await getFiles('blog-posts', 'image');
```

### E-commerce Product Images
```javascript
// Upload product photo
const url = await uploadFile(photoFile, 'products');

// Get all product images
const products = await getFiles('products', 'image');
```

### User Avatars
```javascript
// Upload user avatar
const url = await uploadFile(avatarFile, 'avatars');

// Store URL in user profile
user.avatar_url = url;
```

### Video Platform
```javascript
// Upload video
const url = await uploadFile(videoFile, 'videos');

// Get all videos
const videos = await getFiles(null, 'video');
```

## Notes

- **Public URLs never expire** - files are permanently accessible
- **Automatic MIME type detection** - file type auto-detected from content
- **No authentication for viewing** - anyone with the URL can access the file
- **Cached responses** - list queries are cached for performance
- **Unique filenames** - duplicate uploads get unique suffixes

## Support

For issues or questions, check the worker logs in your Cloudflare dashboard.
