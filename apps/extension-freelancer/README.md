# Gigster Freelancer — Chrome extension

Freelancer.com inbox extension. Same flow as Fiverr extension.

## Client build (Chrome Web Store — what members get)

```bash
npm run extension:client
```

Upload `release/gigster-freelancer.zip`. See [CLIENT.md](./CLIENT.md) and [docs/09-extension-dev-vs-client.md](../../docs/09-extension-dev-vs-client.md).

## Local dev (internal only — not for clients)

```bash
npm run extension:dev:freelancer
```

Load unpacked: `apps/extension-freelancer/dist` (contains `DEV-NOT-FOR-CLIENTS.txt`).

Backend dev env: copy from `.env.extension.dev.example`.

## Production (legacy alias)

```bash
npm run build:extension:store    # same as extension:client
```

See `docs/08-deploy-live.md` §13 for Web Store + Railway `CORS_EXTENSION_IDS`.
