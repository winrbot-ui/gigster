# Gigster Fiverr — Chrome extension

Fiverr inbox extension (v0.6.1). Manual = AI draft, you send. Auto = extension sends on Fiverr.

## Local dev

```bash
npm run setup:extension          # apiBase from apps/web/.env.local (localhost)
npm run build:extension:fiverr
```

Load unpacked: `apps/extension-fiverr/dist`

## Production / Chrome Web Store

```bash
npm run build:extension:store    # → release/gigster-fiverr.zip
```

Then upload zip to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

After install, add the extension **ID** to Railway `CORS_EXTENSION_IDS`. See `docs/08-deploy-live.md` §13.
