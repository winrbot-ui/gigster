# 06 — Conventions

## Monorepo layout

npm workspaces. Dependencies hoist to the root `node_modules`.

```
apps/web/              Next.js 16 app (gigster.website)
  app/(public)/        landing, apply-marketer, tos
  app/(gate)/          invite gate (Turnstile)
  app/(auth)/          signup, login, verify
  app/(app)/           dashboard, agent-setup, projects (active sub)
  app/marketer/        marketer dashboard (role=marketer)
  app/admin/           admin panel (role=admin)
  app/api/             thin route handlers / proxy to backend
  components/          shared UI (ui/ = base design-system primitives)
  lib/                 supabase clients, api client, auth/role helpers
apps/backend/          FastAPI (later phase)
apps/desktop/          Tauri (later phase)
packages/shared-types/ shared schemas (build_spec, project_json, persona, rows)
infra/supabase/        migrations + RLS policies (on-disk source of truth)
docs/                  this documentation (00–07)
```

## Next.js 16 — read first

This is **not** the Next.js in your training data. Before writing web code, read
the relevant guide in `node_modules/next/dist/docs/`. Key breaking changes:

- **Turbopack is default** for `dev` and `build` (no `--turbopack` flag).
- **Async request APIs:** `cookies()`, `headers()`, `draftMode()`, and route
  `params`/`searchParams` are **Promises** — always `await` them.
- **`middleware` → `proxy`**: the file/function is renamed; `proxy` runs on the
  Node.js runtime (no edge).
- **ESLint flat config**; `next lint` is removed (run `eslint` directly).
- `next/image`: `images.domains` deprecated (use `remotePatterns`); new quality /
  cache / local-IP defaults.

## Naming & style

- TypeScript everywhere in JS-land. `strict` on.
- Workspace package names are scoped: `@gigster/web`, `@gigster/shared-types`.
- Import shared types from `@gigster/shared-types` — do **not** redefine schema
  types locally.
- React components: PascalCase files for components, kebab-case for route
  folders. Server Components by default; add `"use client"` only when needed.
- Tailwind 4: theme tokens defined in `apps/web/app/globals.css` via `@theme`.
  Prefer semantic tokens (see `globals.css`) over raw hex in components.

## Environment variables

Copy `.env.example` → `apps/web/.env.local`. Rules:

- `NEXT_PUBLIC_*` is the **only** prefix exposed to the browser. Never put secrets
  there.
- Server-only secrets (service role key, AI keys, backend keys) have no prefix and
  live on the backend / Next.js server only.

| Var | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | RLS bypass (server only) |
| `GIGSTER_API_URL` | server | FastAPI backend base URL |

## Migrations

- Apply schema changes via the **Supabase MCP** (`apply_migration`, snake_case
  name).
- Mirror every migration into `infra/supabase/migrations/` (timestamped SQL) so
  the schema is reproducible on disk and reviewable in PRs.
- RLS policies live alongside their tables in the same migration.

## Documentation upkeep (required)

- When you change **architecture / schema / pipeline**, update the matching
  `docs/` file in the **same PR**.
- Keep `docs/00-master-plan.md` in sync with `.cursor/plans/` on major changes.
- Keep `packages/shared-types` in sync with `02-db-schema.md` and the AI/Agent 2
  contracts.
- Every new agent session: read `AGENTS.md` → follow links into `docs/` → then
  code.

## Git

- Conventional, imperative commit subjects (e.g. `add invite gate`,
  `fix referral self-block`). Only commit when explicitly asked.
