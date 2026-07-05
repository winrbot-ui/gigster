# Gigster

Closed-club SaaS monorepo. Members get an AI persona (Agent 1) that drafts client
replies on freelance platforms, and Agent 2 turns confirmed briefs into deployed
preview sites.

> **New here? Read [`docs/`](./docs) first** — start with [`docs/00-master-plan.md`](./docs/00-master-plan.md).
> Every agent session must read the docs listed in [`AGENTS.md`](./AGENTS.md) before writing code.

## Monorepo layout

```
apps/web/              Next.js 16 + React 19 + Tailwind 4 (gigster.website)
apps/backend/          FastAPI backend (Railway) — AI, Agent 2, Telegram, cron
packages/shared-types/ Single source of truth for shared schemas
infra/supabase/        SQL migrations + RLS policies (source of truth on disk)
docs/                  Canonical project documentation (00–07)
```

This is an npm workspaces monorepo. Dependencies are hoisted to the root
`node_modules`.

## Getting started

```bash
npm install          # install all workspaces
npm run dev          # web app at http://localhost:3000
npm run dev:api      # FastAPI at http://localhost:8000 (pip install -r apps/backend/requirements.txt)
npm run typecheck
npm run build
```

Copy `.env.example` to `apps/web/.env.local` and `apps/backend/.env`.
Apply SQL migrations from `infra/supabase/migrations/` to your Supabase project.

**Production deploy:** see [`docs/08-deploy.md`](./docs/08-deploy.md) (Vercel web + Railway backend).

## Tech stack

- **Frontend:** Next.js 16.2.9 (App Router, Turbopack) + React 19 + Tailwind 4.
  Next.js 16 has breaking changes — read `node_modules/next/dist/docs/` before coding.
- **DB / Auth:** Supabase (Postgres + Auth + RLS). Migrations via Supabase MCP, mirrored in `infra/supabase/`.
- **Backend / AI / Extension:** FastAPI, Anthropic Claude + OpenAI, Chrome MV3 — see `docs/`.
