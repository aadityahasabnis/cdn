# How to Delete Files from Media Gallery

## The Issue

When you click the **🗑️ Delete** button in the gallery, it fails because:

❌ **Delete fails if the entered key does not match configured `ADMIN_API_KEY`**  
❌ **You must use the actual `ADMIN_API_KEY` for the current environment**

## Solution (2 Steps)

### Step 1: Set Your Production API Key

You need to configure a secret API key in Cloudflare:

```bash
cd media-service
npx wrangler secret put ADMIN_API_KEY
```

When prompted, enter a strong password (use a password generator). Example:
```
sk_prod_a8f2b9d4c6e1f3a7b5c2d8e9f1a3b6c4
```

### Step 2: Use the Key in the UI

1. Visit: **https://cdn.aadityahasabnis.workers.dev/**
2. At the top, enter your **Admin API Key**
3. Enter the API key you just created in Step 1
4. The key will be saved in your browser
5. Now try deleting - it should work! ✅

## Visual Guide

```
┌─────────────────────────────────────────────────────┐
│  Media Service Admin Panel                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  API Base URL                                        │
│  [https://cdn.aadityahasabnis.workers.dev    ]      │
│                                                      │
│  API Key  *Required for production                  │
│  [sk_prod_a8f2b9d4c6e1f3a7b5c2d8e9...       ]  👈 Enter here
│                                                      │
└─────────────────────────────────────────────────────┘

Then scroll down and try deleting a file.
```

## Testing

After entering your API key:

1. **Upload a test file** to verify upload works
2. **Delete the test file** to verify delete works
3. Both should now work perfectly ✅

## Why This Happens

The media service has two modes:

**Local Development** (`npm run dev`)
- Uses `ADMIN_API_KEY` from `.dev.vars`
- Works on `http://127.0.0.1:8787`

**Production** (deployed worker)
- Uses `ADMIN_API_KEY` secret from Cloudflare
- Works on `https://cdn.aadityahasabnis.workers.dev`

When key in UI does not match the environment `ADMIN_API_KEY`, authentication fails.

## Alternative: Use cURL

If you prefer command line:

```bash
# Set your API key
export API_KEY="sk_prod_a8f2b9d4c6e1f3a7b5c2d8e9f1a3b6c4"

# Delete a file
curl -X DELETE https://cdn.aadityahasabnis.workers.dev/api/media/delete \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"file_key": "blog/image-abc123.jpg"}'
```

## What If I Forgot My Key?

If you forgot your production API key:

```bash
# Create a new one
npx wrangler secret put ADMIN_API_KEY
```

This will overwrite the old key. Just remember to update it in your UI and any integrations.

## Security Note

🔒 **Never commit or share your `ADMIN_API_KEY`**  
✅ Store it in a password manager  
✅ Use environment variables in your apps  
✅ Don't include it in client-side code  

---

**That's it!** Set the key once, and delete will work forever. The browser saves it for you.
