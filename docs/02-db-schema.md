# 02 — Database Schema

Postgres on Supabase. Migrations are applied via the Supabase MCP and mirrored to
`infra/supabase/migrations/` (source of truth on disk). RLS is enabled on every
table. The matching TypeScript types live in `packages/shared-types`.

## Conventions

- Primary keys are `uuid` (`gen_random_uuid()`), except join/profile tables keyed
  by `user_id`.
- `public.users.id` equals `auth.users.id` (1:1). A trigger on `auth.users`
  inserts the `public.users` row on signup.
- Timestamps are `timestamptz`, default `now()`.
- Enums are real Postgres enum types (see below).
- `service_role` (backend) bypasses RLS for admin/cron work. The browser uses the
  anon key and is constrained by RLS.

## Enums

| Enum | Values |
| --- | --- |
| `user_role` | `member`, `marketer`, `admin` |
| `user_status` | `pending_email`, `pending_payment`, `active`, `expired`, `blocked` |
| `plan` | `basic`, `pro` |
| `payment_status` | `submitted`, `verified`, `rejected` |
| `project_platform` | `upwork`, `fiverr`, `freelancer` (Upwork enum value exists but is `coming_soon` — no new projects) |
| `project_status` | `new`, `negotiating`, `deal`, `done` |
| `agent2_status` | `idle`, `building`, `ready`, `failed` |
| `referral_status` | `pending`, `qualified`, `churned` |
| `message_role` | `client`, `assistant` |

## Tables

### `users`
Profile mirror of `auth.users`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | = `auth.users.id` |
| `email` | text unique | |
| `username` | text unique | `@nickname`, fixed after signup |
| `role` | `user_role` | default `member` |
| `referred_by_id` | uuid FK→users | nullable |
| `status` | `user_status` | default `pending_email` |
| `created_at` | timestamptz | |
| `email_verified_at` | timestamptz | nullable |
| `signup_ip` | inet | nullable; used for self-referral IP block |

### `agent_personas`
Live persona for Agent 1 (read live, never cached).

`user_id` PK FK→users · `agent_name` · `full_name` · `title` · `specialty` ·
`tone` · `experience_years` int · `location` · `never_say` text[] · `always_do`
text · `updated_at`.

### `invite_codes`
`id` PK · `owner_id` FK→users · `code` text unique · `uses_remaining` int ·
`expires_at` timestamptz. Valid only while the owner is `active`.

### `referrals`
`id` PK · `referrer_id` FK→users · `referred_id` FK→users · `qualified_at`
timestamptz null · `status` `referral_status` · `created_at`.

### `marketer_milestones`
`marketer_id` PK FK→users · `milestone_20_paid` bool · `milestone_40_paid` bool ·
`salary_active` bool · `qualified_count` int · `tier_10k_reached_at` ·
`tier_20k_reached_at` · `salary_started_at` · `updated_at`.

Tier mapping: 20 qualified → €10k (`milestone_20_paid`); 40 qualified → €20k
(`milestone_40_paid`) + €5k salary (`salary_active`). Churn clawback decrements
`qualified_count` and reverts tiers via cron.

### `desktop_auto_settings`
Extension Auto mode preferences (table name is historical). `user_id` PK FK→users ·
`enabled` bool · `disclaimer_accepted` bool (required before Auto send) ·
`delay_minutes` int (3–45) · `updated_at`. Synced via `/ext/settings`.

### `subscriptions`
`id` PK · `user_id` FK→users · `plan` `plan` · `platforms_allowed` int (1 for Basic, 2 for Pro) ·
`started_at` · `expires_at` · `active` bool.

### `payments`
`id` PK · `user_id` FK→users · `amount` numeric · `plan` `plan` · `chain` text
(`tron`) · `tx_hash` text · `status` `payment_status` · `paid_at` · `verified_by`
FK→users.

### `projects`
`id` PK · `user_id` FK→users · `platform` `project_platform` · `client_name` ·
`thread_id` text · `status` `project_status` · `project_json` jsonb ·
`build_spec` jsonb · `brief_score` int · `agent2_status` `agent2_status` ·
`preview_url` · `preview_slug` · `created_at`. Unique `(user_id, platform,
thread_id)` when `thread_id` is set. `project_json.client_username` stores the
marketplace handle (e.g. `FLGrace`) when the extension provides it.

### `conversation_messages`
Full inbox log per thread (extension → backend). `id` PK · `user_id` FK→users ·
`platform` `project_platform` · `thread_id` text · `role` `message_role` · `text`
· `sent_at` timestamptz · `created_at`.

### `message_events`
`id` PK · `user_id` FK→users · `platform` `project_platform` · `client_name` ·
`thread_id` · `detected_at` · `processed` bool.

### `few_shot_examples`
`id` PK · `niche` · `client_msg` · `good_reply` · `bad_reply`. (Global reference
data; no per-user rows.)

### `telegram_links`
`user_id` PK FK→users · `chat_id` text · `link_code` text · `linked_at`.

### `ip_attempts` (anti-abuse)
`ip` inet · `endpoint` text · `attempt_count` int · `window_start` timestamptz.
PK `(ip, endpoint)`.

## RLS policy summary

- **Owner-scoped tables** (`users`, `agent_personas`, `invite_codes`,
  `subscriptions`, `payments`, `projects`, `conversation_messages`,
  `message_events`, `telegram_links`):
  a user may `select`/`update` only rows where the owner column = `auth.uid()`.
  Inserts that create user-owned data are constrained the same way.
- **`referrals`**: visible to either the `referrer_id` or `referred_id`.
- **`marketer_milestones`**: visible to the `marketer_id` only.
- **`few_shot_examples`**: readable by authenticated users; writes are
  service-role only.
- **`ip_attempts`**: service-role only (no client access).
- **Admins** (`role = admin`) get broad read/verify access via service-role
  backend endpoints, not via client policies.

The exact SQL lives in `infra/supabase/migrations/`. When you change the schema,
update the migration **and** this file **and** `packages/shared-types` in the
same PR.
