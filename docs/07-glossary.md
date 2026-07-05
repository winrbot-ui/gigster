# 07 — Glossary

- **@nickname / username** — the member's fixed handle, chosen at signup, unique,
  immutable afterward.
- **Member** — a regular paying user (`role = member`). Gets Agent 1 + Agent 2.
- **Marketer** — a user (`role = marketer`) who recruits others and earns via
  referral milestones (see *milestone*). Has a `/marketer` dashboard.
- **Admin** — `role = admin`. Verifies payments and manages users via the
  role-protected `/admin` panel (backed by service-role endpoints).
- **Agent 1** — the AI persona that drafts client replies from inbox message text and
  tracks the negotiation. See `03-ai-pipeline.md`.
- **Agent 2** — the builder that turns a confirmed `build_spec` into a deployed
  preview site at `slug.gigsterr.online`. Runs asynchronously after the member
  chooses **Build site** or **Both**. See `04-agent2.md`.
- **Manual mode** — the extension reads incoming client messages from the platform DOM, generates
  a draft, and the member copies it into the platform chat and clicks Send.
- **Auto mode** — the extension reads messages, generates a draft, types it into
  the compose box and clicks Send after a delay. Requires disclaimer opt-in
  (`disclaimer_accepted` in `desktop_auto_settings`). Long-term Auto use may risk
  platform account bans.
- **persona** — the live identity (`agent_personas` row) Agent 1 writes as. Read
  live, never cached.
- **project_json** — evolving structured state of one client conversation.
- **build_spec** — the validated, buildable site description Agent 2 consumes.
- **brief / brief_score** — the readiness measure (0–100). A brief is actionable
  only when `score >= 85` AND `status = deal` AND `client_confirmed`. Does not
  auto-start Agent 2 — see *brief decision*.
- **brief decision** — member choice when brief is ready: `build` (Agent 2),
  `document` (Markdown + PDF download), or `both`. Submitted via
  `POST /ext/brief/decision`. Types in `packages/shared-types` (`BriefDecisionAction`).
- **new client notification** — Telegram alert sent once when a marketplace thread
  creates a new project (first contact). Distinct from *new message* alerts on
  later messages.
- **qualified user** — a referred user who has met the qualifying condition
  (e.g. became a paying/active subscriber), advancing the referrer toward a
  milestone. Tracked in `referrals.qualified_at` / `status = qualified`.
- **milestone** — marketer payout thresholds (`milestone_20_paid`,
  `milestone_40_paid`, `salary_active`) based on `qualified_count`.
- **invite code** — a code (`invite_codes`) that lets a new user through the gate.
  Valid only while the owner is `active`.
- **gate** — the Turnstile-protected invite entry at `/join` / invite gate.
- **plan** — `basic` ($200, 1 platform: Fiverr or Freelancer) or `pro` ($300,
  2 platforms: Fiverr + Freelancer), 30 days.
- **platform** — a freelance marketplace: `fiverr`, `freelancer` (available), or
  `upwork` (coming soon). See `PLATFORM_CATALOG` in `packages/shared-types`.
- **tx_hash** — the USDT TRC-20 transaction hash a user submits for manual payment
  verification.
