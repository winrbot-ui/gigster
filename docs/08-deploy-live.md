# Deploy live — gigster.website on Vercel

Repo: `https://github.com/winrbot-ui/gigster`  
Live domain: **`https://www.gigster.website`**

## 1. Vercel project settings

Open: **vercel.com → winrbot-ui → gigster-web → Settings**

| Setting | Value |
|---------|--------|
| **Root Directory** | `apps/web` |
| **Framework** | Next.js |
| **Production Branch** | `main` (or your default branch) |

`apps/web/vercel.json` already runs install/build from monorepo root.

## 2. Environment variables (Vercel → Settings → Environment Variables)

Add for **Production** (copy values from `apps/web/.env.local`):

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.gigster.website` |
| `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (Production only, secret) |
| `GIGSTER_API_URL` | backend URL when Railway is live (or leave empty for now) |
| `GIGSTER_USDT_TRC20_ADDRESS` | your USDT TRC-20 wallet |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional — Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | optional — server only |

After saving → **Redeploy** (Deployments → … → Redeploy).

## 3. Domains (Vercel → Settings → Domains)

| Domain | Status |
|--------|--------|
| `www.gigster.website` | should show Valid Configuration |
| `gigster.website` | add + A record `@` → `76.76.21.21` on Namecheap |

## 4. Supabase Auth (Dashboard → Authentication → URL Configuration)

Project: same as in `NEXT_PUBLIC_SUPABASE_URL`.

| Field | Value |
|-------|--------|
| **Site URL** | `https://www.gigster.website` |
| **Redirect URLs** | add each line: |

```
https://www.gigster.website/**
https://gigster.website/**
http://localhost:3000/**
```

## 5. Supabase database migrations

Run all SQL files in order (SQL Editor → New query → paste → Run):

1. `infra/supabase/migrations/20260627000001_enums_and_tables.sql`
2. `infra/supabase/migrations/20260627000002_auth_trigger.sql`
3. `infra/supabase/migrations/20260627000003_rls_policies.sql`
4. `infra/supabase/migrations/20260627000004_policies_and_marketer.sql`

## 6. Namecheap DNS (Advanced DNS → gigster.website)

Already working for www. For apex (optional):

| Type | Host | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

## 7. gigsterr.online (later — Agent 2)

Separate Vercel project + wildcard `*.gigsterr.online`. Not needed until Agent 2 deploy.

## 8. Verify live

- `https://www.gigster.website` — landing loads
- `/join` — invite gate
- Signup flow — email verify redirects work (Supabase URLs above)

## Local dev

Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` only on your machine.
