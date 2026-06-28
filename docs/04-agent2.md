# 04 — Agent 2 (Build & Deploy)

Agent 2 turns a confirmed `build_spec` into a deployed preview site at
`slug.gigsterr.online`.

## Flow

```
build_spec
   │
   ▼ Validate      schema + capabilities, no blockers
   │
   ▼ Pick template business / landing / restaurant
   │
   ▼ Generate      Claude produces the site from the template + spec
   │
   ▼ Build         npm install + build, max 3 retries
   │
   ▼ Deploy        Vercel API alias → slug.gigsterr.online
   │
   ▼ Dashboard "Ready" + preview_url
```

`agent2_status` on the project row tracks this: `idle → building → ready` (or
`failed`). On success, `preview_url` and `preview_slug` are set.

## `build_spec` schema

See the `BuildSpec` type in `packages/shared-types`:

- `template`: `business` | `landing` | `restaurant`
- `site_name`, `tagline`
- `sections[]`: ordered list, each `{ kind, content }`
- `theme`: `{ primary, accent, dark }`
- `contact`: `{ email, phone, address }`

## Section vocabulary (fixed)

Agent 2 may only emit these section kinds:

```
hero, services, about_story, team, contact_form, cta, faq,
pricing, gallery, testimonials, menu, embed, blog_list
```

Defined as `SECTION_KINDS` in `packages/shared-types`. Adding a section kind is a
deliberate change: update the type, this doc, and the generator together.

## Capabilities (can / cannot)

**Can:** static marketing/business/restaurant/landing sites from the section
vocabulary; contact form (submission handled by backend); basic theming; embeds.

**Cannot (blockers — fail validation):** auth/login, databases/user accounts,
payments/checkout, custom backends, real-time features, anything outside the
section vocabulary. Agent 1's scope guard (see `03-ai-pipeline.md`) keeps
promises inside these limits.

## Build retries

The build step retries up to 3 times. Persistent failure → `agent2_status =
failed`, surfaced in the dashboard with a retry affordance.

## Wildcard domain

Preview sites deploy to `{slug}.gigsterr.online`. DNS and Vercel setup are
documented in `infra/vercel-agent2-domain.md`. Set `VERCEL_TOKEN`,
`VERCEL_AGENT2_PROJECT_NAME`, and `AGENT2_DOMAIN` on the backend.
