# Delete Endpoint Auth Notes

## Update Summary

Delete now uses only the `ADMIN_API_KEY` you provide in the UI.

- No hardcoded default API key is used.
- No local-only bypass key is used.
- Local and production both require whatever `ADMIN_API_KEY` is configured for that environment.

## Expected Behavior

1. Enter `ADMIN_API_KEY` in the Admin API Key field.
2. Click delete for a file.
3. Request sends `x-api-key` header with your entered key.
4. Server validates against environment `ADMIN_API_KEY`.

## If delete fails

- Ensure `.dev.vars` has local `ADMIN_API_KEY` for local development.
- Ensure Cloudflare secret `ADMIN_API_KEY` is set for production.
- Ensure the UI field matches that configured key.
