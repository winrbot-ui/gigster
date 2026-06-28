# 07 — Glossary

- **@nickname / username** — the member's fixed handle, chosen at signup, unique,
  immutable afterward.
- **Member** — a regular paying user (`role = member`). Gets Agent 1 + Agent 2.
- **Marketer** — a user (`role = marketer`) who recruits others and earns via
  referral milestones (see *milestone*). Has a `/marketer` dashboard.
- **Admin** — `role = admin`. Verifies payments and manages users via the
  role-protected `/admin` panel (backed by service-role endpoints).
- **Agent 1** — the AI persona that drafts client replies from OCR text and
  tracks the negotiation. See `03-ai-pipeline.md`.
- **Agent 2** — the builder that turns a confirmed `build_spec` into a deployed
  preview site at `slug.gigsterr.online`. See `04-agent2.md`.
- **Manual mode** — the desktop app reads incoming client messages (OCR), generates
  a draft, and the member copies it into the platform chat and clicks Send.
- **Auto mode (Auto RPA)** — the desktop app reads messages, generates a draft,
  sends it via UI Automation, and leaves the thread after 2 minutes if the client
  does not reply. Conversation memory is stored in `project_json` on the backend.
- **persona** — the live identity (`agent_personas` row) Agent 1 writes as. Read
  live, never cached.
- **project_json** — evolving structured state of one client conversation.
- **build_spec** — the validated, buildable site description Agent 2 consumes.
- **brief / brief_score** — the readiness measure (0–100). A brief is generated
  only when `score >= 85` AND `status = deal` AND `client_confirmed`.
- **qualified user** — a referred user who has met the qualifying condition
  (e.g. became a paying/active subscriber), advancing the referrer toward a
  milestone. Tracked in `referrals.qualified_at` / `status = qualified`.
- **milestone** — marketer payout thresholds (`milestone_20_paid`,
  `milestone_40_paid`, `salary_active`) based on `qualified_count`.
- **invite code** — a code (`invite_codes`) that lets a new user through the gate.
  Valid only while the owner is `active`.
- **gate** — the Turnstile-protected invite entry at `/join` / invite gate.
- **plan** — `basic` ($200, 1 platform) or `pro` ($300, 3 platforms), 30 days.
- **platform** — a freelance marketplace: `upwork`, `fiverr`, or `freelancer`.
- **tx_hash** — the USDT TRC-20 transaction hash a user submits for manual payment
  verification.
