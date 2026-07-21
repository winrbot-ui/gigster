# 03 — AI Pipeline (Agent 1)

Agent 1 reads client messages (as inbox text from the Chrome extension DOM adapters) and produces an
on-persona reply, while tracking the negotiation toward a confirmed brief. **All
prompts and persona logic live on the backend only.**

## Flow

```
Inbox message text (from extension)
        │
        ▼
 CALL 1  Extract  (Claude)  ── updates project_json
        │
        ▼
 CALL 2  Draft    (Claude)  ── persona reply, scope-guarded
        │
        ▼
 CALL 3  Brief    (Claude)  ── only after member chooses build/both → build_spec

 (parallel)  Stage detect (GPT-mini) ── cheap negotiation-stage label
```

## `project_json`

The evolving structured understanding of one client conversation. Shape is in
`packages/shared-types` (`ProjectJson`). Key fields: `client_name`,
`client_username` (marketplace handle from the extension), `platform`,
`summary`, `requirements[]`, `open_questions[]`, `out_of_scope_requests[]`
(things the client asked for that Agent 2 cannot build), `budget`, `deadline`,
`status` (`new`/`negotiating`/`deal`/`done`), `client_confirmed`, `notes`.

- **CALL 1 Extract** merges new inbox text into the existing `project_json` (never
  blindly overwrites; appends/refines requirements and open questions).

## `build_spec`

Produced by CALL 3 **only after** the member submits a brief decision of `build`
or `both`. The Agent 2 contract — see `04-agent2.md` and the `BuildSpec`
type in `packages/shared-types`.

## Brief readiness gate

A brief is considered **ready for member action** when all hold:

```
brief_score >= 85  AND  status == "deal"  AND  client_confirmed == true
```

`brief_score` (0–100) measures how complete/unambiguous the requirements are.
Below 85 → Agent 1 keeps asking `open_questions` instead of offering a brief choice.
The canonical helpers are `BRIEF_READINESS_MIN_SCORE` and `isBriefReady()` in
`packages/shared-types`.

**Important:** readiness does **not** auto-trigger Agent 2 or CALL 3 Brief. The
extension popup (or dashboard) presents three options:

| Action | Result |
| --- | --- |
| `build` | Generate `build_spec`, enqueue async Agent 2 |
| `document` | Generate Markdown + PDF client brief for download |
| `both` | Build site and deliver the document |

Submitted via `POST /ext/brief/decision` with `{ project_id, action }`.
Types: `BriefDecisionAction` in `packages/shared-types`.

## Persona rules

- The persona (`agent_personas` row) is read **live** on every Draft call — edits
  in the dashboard take effect immediately, no caching.
- Drafts must honor `never_say[]` and `always_do`, and match `tone`, `title`,
  `specialty`, `experience_years`, `location`.
- Draft system prompt lives in `apps/backend/app/prompts/agent1_draft.txt` and is
  filled with persona fields, negotiation **stage**, platform label, and the
  capabilities block (see below).

## Stage-aware draft

Parallel **Stage detect** (GPT-mini) labels the inbox turn as one of:
`new`, `discovery`, `negotiation`, `order`, `delivery`, `revision`.

Draft receives this stage plus **all previous_replies** in the thread so wording
does not repeat. Stage also nudges `project_json.status` (e.g. `order` → `deal`
when appropriate).

## Humanization layer

Draft quality is enforced by two layers:

1. **Static prompt** — `apps/backend/app/prompts/agent1_draft.txt` with strict
   human-texting rules (greet once, question budget, length variation, CMS name
   ban) and embedded GOOD vs BAD few-shot pairs.
2. **Dynamic constraints** — `_conversation_state()` in `pipeline.py` computes
   per-reply orders from the thread (already greeted, name overuse, consecutive
   questions, recent reply length, banned openers already used) and injects them
   into the system prompt via `{conversation_state}`.

Draft runs at `temperature=0.9` for natural variation.

## Scope guard

Single source of truth: `packages/shared-types/src/capabilities.ts` (mirrored in
`apps/backend/app/services/ai/capabilities.py`).

- **Five offerings** (business, landing, restaurant, portfolio, event) — shown in
  Agent Setup and injected into Extract/Draft/Brief prompts via
  `capabilities_prompt_block()`.
- **CAN / CANNOT** lists with suggested alternatives for out-of-scope asks.
- **Extract** records unsupported requests in `out_of_scope_requests[]`.
- **Draft** declines politely and steers toward a supported offering; never
  commits to WordPress, mobile apps, auth, payments, etc.
- **Blocker patterns** are shared with Agent 2 validation (see `04-agent2.md`).

## Few-shot examples

`few_shot_examples` (per niche: `client_msg` + `good_reply` + `bad_reply`) are
injected server-side to steer Draft quality. They are global reference data, not
user-editable.

## Models

- **Claude (Opus/Sonnet):** Extract, Draft, Brief, and Agent 2 Build generation.
- **GPT-mini:** cheap parallel stage detection only.

## Telegram notifications

| Event | When |
| --- | --- |
| **New client** | First time a thread creates a new project (first contact) |
| **New message** | Subsequent client messages on an existing thread |
| **Brief ready** | After member chooses `build` or `both` and Agent 2 is enqueued |
| **Site ready** | Agent 2 deploy completes (`agent2_status = ready`) |

Telegram linking is required for new-client alerts; see the settings guide in the web app.
