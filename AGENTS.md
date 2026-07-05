<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:gigster-project -->
# Gigster — read before coding

This repo is **Gigster** (closed-club SaaS: AI persona drafts client replies,
Agent 2 builds preview sites). It is an npm-workspaces monorepo
(`apps/web`, `apps/backend`, `packages/shared-types`,
`infra/supabase`).

Before writing code, read the canonical docs in `docs/`:

- `docs/00-master-plan.md` — what we are building + locked decisions
- `docs/01-architecture.md` — components, data flow, domains
- `docs/02-db-schema.md` — tables, enums, relations, RLS
- `docs/03-ai-pipeline.md` — Agent 1 (Extract/Draft/Brief/Stage), scoring
- `docs/04-agent2.md` — `build_spec`, capabilities, sections, build+deploy
- `docs/05-security.md` — gate, anti-abuse, rate limits, RLS, server-only prompts
- `docs/06-conventions.md` — monorepo layout, naming, env vars, migrations
- `docs/07-glossary.md` — domain terms

Rules:
- Import shared schema types from `@gigster/shared-types`; never redefine them.
- AI prompts/persona logic live **only** on the backend, never in the web client.
- Keep `docs/` and `packages/shared-types` in sync with code in the same PR.
<!-- END:gigster-project -->
