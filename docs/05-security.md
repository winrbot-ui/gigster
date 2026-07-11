# 05 — Security (medium level)

## Edge

- **Cloudflare** sits in front of Vercel: DNS proxy, WAF rules, DDoS protection.
- **Turnstile** on the invite gate and signup forms (bot protection).

## Public vs closed surface

- **Public:** `/`, `/apply-marketer`, `/tos`, `/join?ref=`, the invite gate.
  Keep public pages minimal — no sensitive data.
- **Free tier (JWT, any non-blocked member):** `/dashboard`, `/agent-setup`,
  `/projects`, `/buy`, and Agent 1 drafting (`POST /ext/thread`, `/ext/auto-settings`).
  Gated by `requireMember` (web) / `require_agent1_user` (backend). Agent 1 is free
  until the member's first concluded deal.
- **Paid (JWT + active subscription):** the client brief document
  (`GET /ext/brief/document/*`), brief decision (`POST /ext/brief/decision`), and
  Agent 2 (`/ext/agent2/*`, retry). Gated by `requireActive` (web) /
  `require_active_user` (backend). The extension is useless for the paid payoff
  without a live subscription, so copying the unpacked extension does not bypass it.
- **Role-gated:** `/marketer` (role), `/admin` (role). Sensitive content is
  server-rendered behind auth.

## Auth & access

- Supabase Auth (email verification, JWT, sessions).
- **RLS on every table** — a user sees only their own rows. `service_role`
  (backend) bypasses RLS for admin/cron operations. See `02-db-schema.md`.
- Every mutation endpoint is behind JWT **and** a subscription check.

## Anti-abuse / rate limits

- **IP rate limits** tracked in `ip_attempts`:
  - invite gate: 3 attempts / IP / 24h
  - login and crypto (tx_hash) submit: throttled
- **Self-referral block** at signup (by email **and** IP).
- Invite codes are valid **only while the owner is `active`**.

## Secrets & prompts

- **AI prompts and persona logic live only on the backend.** They are never in
  the web bundle and never in the extension bundle.
- Service role key, Anthropic/OpenAI keys, Resend, Telegram, and Vercel API keys
  live only on the backend (and, for the service role key, the Next.js server
  for auth-gated reads). Never `NEXT_PUBLIC_*`.
- The browser only ever holds the Supabase anon key + the user's JWT.

## Web boundary rules

- Server Components may read auth-gated data directly from Supabase.
- Sensitive actions (AI, persona, payment verify, Agent 2 trigger) are proxied to
  the backend with the user's JWT; the web app does not implement them locally.
