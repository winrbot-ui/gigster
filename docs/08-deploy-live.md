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
| `GIGSTER_API_URL` | Railway backend URL — see section 9 (**not** gigster.website) |
| `GIGSTER_USDT_TRC20_ADDRESS` | your USDT TRC-20 wallet |
| `RESEND_API_KEY` | Resend API key (activation + marketer emails from admin) |
| `RESEND_FROM` | e.g. `Gigster <noreply@gigster.website>` |
| `NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL` | optional — direct link to Windows `.exe` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | optional — bot username without `@` |
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
5. `infra/supabase/migrations/20260627000005_signup_ip.sql`
6. `infra/supabase/migrations/20260627000006_auto_mode_and_milestones.sql`

## 9. Railway backend (`apps/backend`)

1. **railway.app** → New → **GitHub Repository** → `winrbot-ui/gigster`
2. Service **Settings → Root Directory:** `apps/backend`
3. **Variables** (not Vercel `NEXT_PUBLIC_*`):

```
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
ANTHROPIC_API_KEY=...
CORS_ORIGINS=https://www.gigster.website,https://gigster.website
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...   (or reuse CRON_SECRET)
RESEND_API_KEY=...
RESEND_FROM=Gigster <noreply@gigster.website>
SITE_URL=https://www.gigster.website
CRON_SECRET=...               (same secret for all cron + Telegram webhook path)
```

**Scheduled cron jobs** (Railway cron or external scheduler — daily, header `X-Cron-Secret: $CRON_SECRET`):

| POST endpoint | Purpose |
|---------------|---------|
| `/cron/subscriptions/expire` | Deactivate memberships past `expires_at` |
| `/cron/subscriptions/warn-expiry` | Email “expires in 3 days” warning |
| `/cron/referrals/qualify` | 90-day referral qualification |
| `/cron/referrals/churn` | Churn clawback for marketers |

4. **Networking → Generate Domain** → copy URL, e.g.  
   `https://gigster-production-a1b2.up.railway.app`

5. **Health check** (correct URL — do **not** mix with gigster.website):

```
https://YOUR-SERVICE.up.railway.app/health
→ {"status":"ok","service":"gigster-api"}
```

6. Vercel → `GIGSTER_API_URL` = that Railway URL (no trailing slash)

7. Telegram webhook (once backend is live):

```bash
# Set GIGSTER_API_URL in apps/web/.env.local to Railway URL, then:
node scripts/set-telegram-webhook.mjs
```

**Wrong:** `https://www.gigster.websitec.railway.app` — that is not a valid Railway domain.

## 10. Namecheap DNS (Advanced DNS → gigster.website)

Already working for www. For apex (optional):

| Type | Host | Value |
|------|------|-------|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

## 11. gigsterr.online (later — Agent 2)

Separate Vercel project + wildcard `*.gigsterr.online`. Not needed until Agent 2 deploy.

## 12. Verify live

- `https://www.gigster.website` — landing loads
- `/join` — invite gate
- Signup flow — email verify redirects work (Supabase URLs above)

## Local dev

Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` only on your machine.
