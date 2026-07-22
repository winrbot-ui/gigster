# 08 — Deploy (production)

## Overview

| Service | Host | Root directory |
| --- | --- | --- |
| Web (Next.js) | Vercel | `apps/web` |
| Backend (FastAPI) | Railway | `apps/backend` |
| DB + Auth | Supabase | (already cloud) |
| DNS + Turnstile | Cloudflare | — |

## 1. Vercel (web)

1. [vercel.com/new](https://vercel.com/new) → Import this GitHub repository
2. **Root Directory:** `apps/web` (required for monorepo)
3. Framework: Next.js (auto-detected). `vercel.json` sets install/build from repo root.
4. **Environment variables** (Production):

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://gigster.website` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `GIGSTER_API_URL` | Railway backend URL, e.g. `https://api.gigster.website` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Server only |
| `GIGSTER_USDT_TRC20_ADDRESS` | Payment address |

5. Deploy → add custom domain `gigster.website`

## 2. Railway (backend)

1. [railway.app/new](https://railway.app/new) → Deploy from GitHub → select this repository
2. **Root Directory:** `apps/backend`
3. Railway uses `Dockerfile` + `railway.toml` (health check on `/health`)
4. **Variables** — copy from `apps/backend/.env.example`
5. **Settings → Networking → Generate domain** → e.g. `gigster-api-production.up.railway.app`
6. Optional custom domain: `api.gigster.website` → CNAME to Railway
7. Set `CORS_ORIGINS=https://gigster.website,https://www.gigster.website`
8. Update Vercel `GIGSTER_API_URL` to the Railway public URL

## 3. Supabase Auth URLs

Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://gigster.website`
- **Redirect URLs:** `https://gigster.website/auth/callback`, `https://gigster.website/**`

## 4. Cloudflare DNS

| Type | Name | Target |
| --- | --- | --- |
| CNAME | `@` or `www` | Vercel |
| CNAME | `api` | Railway |

## 5. Verify

```bash
curl https://YOUR-RAILWAY-URL/health
# → {"status":"ok","service":"gigster-api"}
```

Open `https://gigster.website` → invite gate → signup flow.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck + web build + backend compile on every push to `main`.
