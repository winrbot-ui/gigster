# Gigster Fiverr — Chrome extension

Fiverr inbox extension (v0.6.1). Manual = AI draft, you send. Auto = extension sends on Fiverr.

## Client build (Chrome Web Store — what members get)

```bash
npm run extension:client
```

Upload `release/gigster-fiverr.zip`. See [CLIENT.md](./CLIENT.md) and [docs/09-extension-dev-vs-client.md](../../docs/09-extension-dev-vs-client.md).

## Local dev (internal only — not for clients)

```bash
npm run extension:dev:fiverr
```

Load unpacked: `apps/extension-fiverr/dist` (contains `DEV-NOT-FOR-CLIENTS.txt`).

Backend dev env: copy from `.env.extension.dev.example`.

## Production / Chrome Web Store (legacy alias)

```bash
npm run build:extension:store    # same as extension:client → release/gigster-fiverr.zip
```

After install, add the extension **ID** to Railway `CORS_EXTENSION_IDS`. See `docs/08-deploy-live.md` §13.
