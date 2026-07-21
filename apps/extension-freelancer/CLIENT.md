# Gigster Freelancer — client deliverable

This folder is the **Chrome extension you ship to members** (Chrome Web Store).

## Build for clients (production only)

From repo root:

```bash
npm run extension:client
```

Upload **`release/gigster-freelancer.zip`** — not `apps/extension-freelancer/dist`.

## Do not ship dev builds

- `npm run extension:dev:freelancer` → internal testing only
- Never share the `dist/` folder from a dev build

## Local dev (internal)

See [docs/09-extension-dev-vs-client.md](../../docs/09-extension-dev-vs-client.md).
