# 04 — Agent 2 (Build & Deploy)

Agent 2 turns a confirmed `build_spec` into a deployed preview site at
`slug.gigsterr.online`. Builds run **asynchronously** — never blocking the
`/ext/thread` response.

## Flow

```
Member chooses build or both (POST /ext/brief/decision)
        │
        ▼ CALL 3 Brief (if not already) → build_spec persisted
        │
        ▼ Background task enqueued
        │
        ▼ Validate      schema + capabilities, no blockers
        │
        ▼ Pick template   business / landing / restaurant / portfolio / event
        │
        ▼ Generate        Claude produces the site (template + spec + project/persona context)
        │
        ▼ Build           npm install + build, max 3 retries
        │
        ▼ Deploy          Vercel API alias → slug.gigsterr.online
        │
        ▼ Dashboard / popup "Ready" + preview_url
```

`agent2_status` on the project row tracks this: `idle → building → ready` (or
`failed`). On success, `preview_url` and `preview_slug` are set.

The extension popup and dashboard **poll** `agent2_status` (via project fetch or
dedicated status endpoint) while `building`. The synchronous `/ext/thread` response
does not wait for deploy to finish.

## Triggers

| Source | When |
| --- | --- |
| `POST /ext/brief/decision` (`build` or `both`) | Member confirms via extension popup |
| Dashboard **Retry Agent 2** | Manual retry after `failed` |
| `POST /ai/agent2` or cron retry | Admin / recovery paths |

The `document` action generates a client-facing Markdown + PDF brief only — no
Agent 2 run.

## `build_spec` schema

See the `BuildSpec` type in `packages/shared-types`:

- `template`: `business` | `landing` | `restaurant` | `portfolio` | `event`
- `site_name`, `tagline`
- `sections[]`: ordered list, each `{ kind, content }`
- `theme`: `{ primary, accent, dark }`
- `contact`: `{ email, phone, address }`

## Section vocabulary (fixed)

Agent 2 may only emit these section kinds:

```
hero, services, about_story, team, contact_form, cta, faq,
pricing, gallery, testimonials, menu, embed, blog_list,
stats, features, process, video, map, hours, social_links,
logos, booking_embed, newsletter
```

Defined as `SECTION_KINDS` in `packages/shared-types`. Adding a section kind is a
deliberate change: update the type, this doc, and the generator together.

## Capabilities (can / cannot)

Canonical lists live in `packages/shared-types/src/capabilities.ts` (Python mirror:
`apps/backend/app/services/ai/capabilities.py`).

**Can:** static marketing sites across five templates; contact forms; theming;
YouTube/Calendly/Google Maps embeds (`video`, `booking_embed`, `map`); gallery
images; newsletter signup UI; premium renderer (Google Fonts, scroll reveal, OG
meta) in `site-builder/build.mjs`.

**Cannot (blockers — fail validation):** WordPress/CMS handoff, mobile/native apps,
auth/login, databases/user accounts, payments/checkout, custom backends,
real-time/chat, SaaS dashboards, anything outside the section vocabulary.
Validation scans all spec text (site name, tagline, summary, section content,
contact fields) via regex patterns in `BLOCKER_PATTERNS`.

**Generate step:** `apps/backend/app/prompts/agent2_generate.txt` receives full
`project_json` and persona context so section copy reflects the negotiated brief.

## Local preview (no Vercel token)

When `VERCEL_TOKEN` is unset, deploy copies the built site to
`apps/backend/.previews/{slug}/` and the backend serves it at
`GET /previews/{slug}/` for local dev and the simulator.

## Build retries

The build step retries up to 3 times. Persistent failure → `agent2_status =
failed`, surfaced in the dashboard with a retry affordance.

## Wildcard domain

Preview sites deploy to `{slug}.gigsterr.online`. DNS and Vercel setup are
documented in `infra/vercel-agent2-domain.md`. Set `VERCEL_TOKEN`,
`VERCEL_AGENT2_PROJECT_NAME`, and `AGENT2_DOMAIN` on the backend.

## Brief document (document / both actions)

When the member chooses `document` or `both`, the backend renders a clean client
brief from `project_json` / `build_spec`:

- **Markdown** — title, requirements, budget, deadline, open questions
- **PDF** — same content, formatted for delivery to the client

Returned as a downloadable response from the brief-decision handler.
