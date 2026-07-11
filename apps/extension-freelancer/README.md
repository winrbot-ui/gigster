# Gigster Freelancer — Chrome extension

Freelancer.com inbox extension. Same flow as Fiverr extension.

## Local dev

```bash
npm run setup:extension
npm run build:extension:freelancer
```

Load unpacked: `apps/extension-freelancer/dist`

## Production / Chrome Web Store

```bash
npm run build:extension:store    # → release/gigster-freelancer.zip
```

See `docs/08-deploy-live.md` §13 for Web Store + Railway `CORS_EXTENSION_IDS`.
