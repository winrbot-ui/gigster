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
3. Service **Settings → Config file path:** `/apps/backend/railway.toml`  
   (Railway does **not** auto-load config from Root Directory — this step is required.)
4. Service **Settings → Build → Builder:** `Dockerfile` (not Nixpacks / npm)
5. **Clear** any custom Start Command in the dashboard (Settings → Deploy).  
   If it still says `npm run start`, Railway will crash with `npm could not be found`  
   inside the Python Docker image. `railway.toml` uses `start.sh` (uvicorn on `$PORT`).
6. **Networking → Public domain → Target port:** leave empty / automatic, or match `$PORT`.  
   A hardcoded `8000` while the app listens on Railway's dynamic `PORT` causes **502**.
7. **Variables** (not Vercel `NEXT_PUBLIC_*`):

```
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
SUPABASE_ANON_KEY=...          (extension login — same as Vercel NEXT_PUBLIC_SUPABASE_ANON_KEY)
ANTHROPIC_API_KEY=...
CORS_ORIGINS=https://www.gigster.website,https://gigster.website
CORS_EXTENSION_IDS=...         (Chrome extension ID(s), comma-separated — see section 13)
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
- `https://gigsterbackend-production.up.railway.app/health` — `{"status":"ok","service":"gigster-api"}`

## 13. Chrome extensions (production + Web Store)

### Build production zips (from repo root)

```bash
npm run build:extension:store
```

**Fiverr:** `docs/chrome-store-CHECKLIST.md`, `docs/chrome-store-fiverr-listing.md`, `docs/chrome-store-privacy-paste.md`

**Freelancer:** `docs/chrome-store-freelancer-CHECKLIST.md`, `docs/chrome-store-freelancer-listing.md`, `docs/chrome-store-freelancer-privacy-paste.md`

Creates:

- `release/gigster-fiverr.zip`
- `release/gigster-freelancer.zip`

Each zip contains production `apiBase` and omits manifest `key` (required for Web Store upload).
After publish, update Railway `CORS_EXTENSION_IDS` with the Store-assigned extension ID.

### Chrome Web Store (one-time)

1. https://chrome.google.com/webstore/devconsole — pay **$5** developer fee
2. **New item** → upload `release/gigster-fiverr.zip` (repeat for freelancer)
3. Listing: name, description, screenshots (1280×800), category **Productivity**
4. **Privacy policy URL:** `https://www.gigster.website/privacy`
5. Submit for review (typically 1–7 days)

### Extension ID → Railway CORS

After **Load unpacked** (beta) or **Web Store publish**, open `chrome://extensions` → copy **ID** (32 chars).

Railway → `@gigster/backend` → **Variables**:

```
CORS_EXTENSION_IDS=lfmmjponcopmghlpgmfgpnjeegbfbjeg,mkmliddnbpnadmcpcjfinanpfajeiema
```

(Stable IDs from `infra/chrome-extension-keys.json` — pinned via manifest `key` field.)

Redeploy backend. Without this, extension API calls are blocked by CORS.

### Beta without Web Store

Chrome → Extensions → Developer mode → **Load unpacked** → `apps/extension-fiverr/dist` (after `npm run build:extension:prod`).

## Local dev

Use `NEXT_PUBLIC_SITE_URL=http://localhost:3000` in `.env.local` only on your machine.
