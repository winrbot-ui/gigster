# Supabase (infra)

On-disk source of truth for the database. Migrations here mirror what is applied
to the remote Supabase project. See `docs/02-db-schema.md` and
`docs/06-conventions.md`.

**Active project:** `gigster` · ref `uyhicdgnaairxuvwfaoo` ·
`https://uyhicdgnaairxuvwfaoo.supabase.co`

**Pooler (session mode, IPv4):** `aws-1-eu-west-2.pooler.supabase.com:5432`  
**DB user:** `postgres.uyhicdgnaairxuvwfaoo`

## Migrations (apply in order)

1. `20260627000001_enums_and_tables.sql` — enums + core tables
2. `20260627000002_auth_trigger.sql` — `auth.users` → `public.users` trigger
3. `20260627000003_rls_policies.sql` — RLS enable + owner policies
4. `20260627000004_policies_and_marketer.sql` — marketer apps, extra policies, invite RPC
5. `20260627000005_signup_ip.sql` — `users.signup_ip`
6. `20260627000006_auto_mode_and_milestones.sql` — desktop auto settings, milestone tiers

## Apply via script (recommended on Windows / IPv4)

Copy `.env.example` → `.env` in this folder and set `SUPABASE_DB_PASSWORD` (from
Dashboard → Project Settings → Database). Then:

```powershell
cd infra/supabase
# PowerShell
$env:SUPABASE_DB_PASSWORD = "your-db-password"
node apply-migrations.mjs
```

Optional overrides: `SUPABASE_DB_HOST`, `SUPABASE_DB_USER`, `SUPABASE_PROJECT_REF`.

The script auto-probes pooler clusters if `SUPABASE_DB_HOST` is unset. For this
project the working host is **`aws-1-eu-west-2.pooler.supabase.com`**.

## Apply via Supabase MCP

Point the Cursor Supabase MCP at project `uyhicdgnaairxuvwfaoo`, then run
`apply_migration` once per SQL file (snake_case name).

## After applying

- Paste **service_role** key into `apps/web/.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- Run `get_advisors` (security + performance) via MCP
- Optionally regenerate TS types with `generate_typescript_types`
