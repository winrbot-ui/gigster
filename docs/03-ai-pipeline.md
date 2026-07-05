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
`summary`, `requirements[]`, `open_questions[]`, `budget`, `deadline`, `status`
(`new`/`negotiating`/`deal`/`done`), `client_confirmed`, `notes`.

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

## Scope guard

Agent 1 must not over-promise. Replies stay within what Agent 2 can actually
build (see `04-agent2.md` capabilities). If a client asks for something out of
scope, the draft steers toward a supported alternative or flags it as an open
question rather than committing.

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
