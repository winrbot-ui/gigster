# 00 — Gigster Master Plan

> Single source of truth (high level). The working plan lives in
> `.cursor/plans/`; this file is the canonical, version-controlled copy. Keep it
> in sync on major changes.

## What Gigster is

Gigster is a **closed-club SaaS**. Members are freelancers. The product gives each
member:

1. **Agent 1** — an AI persona that reads incoming client messages (via the Gigster
   Chrome extension reading the platform inbox DOM) and drafts on-brand replies, tracks the negotiation,
   and—once a deal is confirmed—produces a structured **brief**.
2. **Agent 2** — turns a confirmed brief (`build_spec`) into a real, deployed
   preview website at `slug.gigsterr.online`. Triggered only after the member
   explicitly chooses **Build site** (or **Both**) when the brief is ready.

Access is invite-only and paid (USDT TRC-20, manually verified).

## Locked decisions

- **Domains:** platform on `gigster.website` (landing, gate, signup, buy,
  dashboard, marketer, admin). Agent 2 previews on `*.gigsterr.online`.
- **Plans:** Basic $200 (1 platform) / Pro $300 (2 platforms: Fiverr + Freelancer), 30 days.
  Upwork is **coming soon** — not offered for new projects until released.
- **Payment:** USDT TRC-20, manual. User submits `tx_hash` → admin verifies →
  subscription activates.
- **Auth:** Supabase Auth (email verification, JWT, sessions).
- **DB:** Supabase Postgres. Migrations via Supabase MCP, mirrored to
  `infra/supabase/`. RLS always on.
- **AI:** prompts live **only** on the backend. Extension sends inbox message text → backend
  returns a draft. Claude (Opus/Sonnet) for Extract/Draft/Brief/Build; GPT-mini
  for stage detection.
- **Telegram:** one central Gigster bot; linked via `/start` + code. Separate
  notifications for **new client** (first thread contact) vs **new message** (subsequent).
- **Design:** dark, premium, exclusive, minimalist. Language: English only.
- **Admin:** `/admin` route inside the same Next.js app, role-protected.
- **Security (medium):** Cloudflare in front of Vercel, Turnstile on gate/signup,
  IP rate limiting, RLS, server-only prompts.

## Tech stack

- **Frontend:** Next.js 16.2.9 + React 19 + Tailwind 4 (`apps/web`). Next.js 16
  has breaking changes — read `node_modules/next/dist/docs/` before coding.
- **Backend:** FastAPI (Python) on Railway (`apps/backend`).
- **DB/Auth:** Supabase (Postgres + Auth + RLS).
- **Extensions:** Chrome MV3 — one per marketplace:
  `apps/extension-fiverr`, `apps/extension-freelancer` (active);
  `apps/extension-upwork` (scaffold only, not offered in UI).
  Manual mode first (copy draft), Auto send later with disclaimer opt-in.
- **AI:** Anthropic Claude + OpenAI GPT-mini (server-side only).
- **Email:** Resend. **Telegram:** Bot API. **Agent 2 deploy:** Vercel API.
- **Edge/security:** Cloudflare (DNS proxy, WAF, Turnstile).

## Phase order (MVP)

Web first. Start from Supabase + web shell, then build up to AI, extension inbox
monitor, and Agent 2.

1. **P0 Foundation** — monorepo (`apps/web`), docs, Supabase project + Auth.
2. **P1 DB schema** — all tables + RLS + `packages/shared-types`.
3. **P2 Web shell** — route groups, dark design system, layout, base UI.
4. Auth flows (signup/login/verify, invite gate) → buy/payments → dashboard →
   AI pipeline (backend) → Chrome extensions (Fiverr + Freelancer) → Agent 2.

## Document map

| File | Contents |
| --- | --- |
| `00-master-plan.md` | This file. What we build + decisions. |
| `01-architecture.md` | Components, data flow, domains, diagrams. |
| `02-db-schema.md` | Tables, columns, enums, relations, RLS. |
| `03-ai-pipeline.md` | Agent 1 (Extract/Draft/Brief/Stage), `project_json`, scoring, brief decision. |
| `04-agent2.md` | `build_spec` schema, capabilities, sections, async build+deploy. |
| `05-security.md` | Gate, anti-abuse, rate limits, Turnstile, RLS, server-only prompts. |
| `06-conventions.md` | Monorepo layout, naming, env vars, migrations, doc upkeep. |
| `07-glossary.md` | Terms: @nickname, roles, Manual/Auto, qualified, milestone. |
| `08-deploy.md` | Vercel + Railway production deploy steps. |
