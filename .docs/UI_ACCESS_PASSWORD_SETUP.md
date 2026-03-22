# UI Access Password Setup (Local + Production)

This guide explains exactly what to do after adding:

```jsonc
"UI_ACCESS_PASSWORD": "..."
```

---

## 1) Understand where values are stored

### `wrangler.jsonc` → `vars`
- Public configuration values.
- Committed to git (if you push the file).
- Visible to anyone with repository access.

### `wrangler secret put ...`
- Encrypted Cloudflare Worker secrets.
- Not stored in git.
- Correct place for real production passwords/keys.

---

## 2) What to do now (recommended)

### Step A: Keep only safe placeholder in `wrangler.jsonc`

Use a non-sensitive placeholder:

```jsonc
"UI_ACCESS_PASSWORD": "change-me-in-prod"
```

Do not keep real production password in `wrangler.jsonc`.

---

### Step B: Set real password as production secret

From `media-service` folder:

```bash
npx wrangler secret put UI_ACCESS_PASSWORD
```

When prompted, enter your real production UI password.

Also ensure admin API key secret exists:

```bash
npx wrangler secret put ADMIN_API_KEY
```

---

### Step C: Deploy

```bash
npm run deploy
```

After deploy, the UI gate uses secret value from Cloudflare environment.

---

## 3) Local development setup

Use `.dev.vars` (git-ignored) for local secrets.

Example `.dev.vars`:

```bash
ADMIN_API_KEY=your-admin-api-key
UI_ACCESS_PASSWORD=ui-access-password
```

Run local:

```bash
npm run dev
```

---

## 4) What should be pushed to GitHub

Push:
- UI code changes
- docs changes
- safe placeholder in `wrangler.jsonc`

Do NOT push:
- real `UI_ACCESS_PASSWORD`
- real `ADMIN_API_KEY`
- `.dev.vars`

---

## 5) Quick verification checklist

1. Local: open `http://127.0.0.1:8787`, enter local UI password, confirm unlock.
2. Production: open your worker URL, enter production UI password, confirm unlock.
3. Upload/delete works only with correct `ADMIN_API_KEY`.
4. `wrangler.jsonc` in git contains no real secret values.

---

## 6) Rotation (if password was exposed)

If real password was committed before:
1. Change it immediately:
   ```bash
   npx wrangler secret put UI_ACCESS_PASSWORD
   ```
2. Redeploy:
   ```bash
   npm run deploy
   ```
3. Replace committed value with placeholder in `wrangler.jsonc`.

