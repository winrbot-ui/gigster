# Gigster Fiverr — client deliverable

This folder is the **Chrome extension you ship to members** (Chrome Web Store).

## Build for clients (production only)

From repo root:

```bash
npm run extension:client
```

Upload **`release/gigster-fiverr.zip`** — not `apps/extension-fiverr/dist`.

## Do not ship dev builds

- `npm run extension:dev:fiverr` → internal testing only (`DEV-NOT-FOR-CLIENTS.txt` in dist)
- Never share the `dist/` folder from a dev build

## Local dev (internal)

See [docs/09-extension-dev-vs-client.md](../../docs/09-extension-dev-vs-client.md).
