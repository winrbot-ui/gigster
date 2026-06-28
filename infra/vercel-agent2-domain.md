# Agent 2 preview domain — `*.gigsterr.online`

Agent 2 deploys static preview sites to Vercel and assigns each build a
subdomain alias: `{preview_slug}.gigsterr.online`.

## DNS (Cloudflare recommended)

1. Add `gigsterr.online` to your Vercel team (Settings → Domains).
2. In Cloudflare DNS for `gigsterr.online`:
   - **A** record `@` → `76.76.21.21` (Vercel apex) — proxied optional
   - **CNAME** `*` → `cname.vercel-dns.com` — proxied optional (wildcard previews)
3. In Vercel, verify the apex domain; wildcard `*.gigsterr.online` is covered by
   the CNAME when assigned per deployment alias.

## Backend env

```env
VERCEL_TOKEN=...
VERCEL_TEAM_ID=...          # optional, for team projects
VERCEL_AGENT2_PROJECT_NAME=gigster-agent2-previews
AGENT2_DOMAIN=gigsterr.online
```

On each deploy with `VERCEL_TOKEN` set, the worker calls `ensure_wildcard_domain()`
to register the apex domain on the Vercel team/project before assigning
`{slug}.gigsterr.online`.

## Manual verification

After DNS propagates:

```bash
curl -I https://test-slug.gigsterr.online
```

A successful alias returns `200` once a deployment exists for that slug.

## Without Vercel token

Local/dev runs skip upload and return the preview URL pattern only. The dashboard
still shows `https://{slug}.gigsterr.online` for integration testing.
