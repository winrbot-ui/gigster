# Chrome Web Store — Gigster Fiverr

Copy-paste guide. Open Developer Dashboard → **Gigster Fiverr** → **Store listing**.

---

## Store listing tab

| Field | Value |
|-------|--------|
| **Title** | `Gigster Fiverr` (already set) |
| **Summary** | Copy block A below |
| **Description** | Copy block B below |
| **Category** | `Productivity` |
| **Language** | `English` |

### Block A — Summary (max 132 chars)

```
AI drafts Fiverr client replies in your voice. Free until your first deal — membership unlocks brief + preview site.
```

### Block B — Description

```
Gigster drafts every Fiverr client reply in your voice — so you can focus on closing deals, not typing.

• Agent 1 writes on-brand replies from your inbox
• Manual mode: you review and send
• Auto mode: optional auto-send (use carefully)
• Tracks negotiation and brief readiness
• Free until your first closed client

Requires a Gigster account (invite-only). Sign up at https://www.gigster.website, set your persona, then log in through the extension popup.

After your first deal, activate membership to unlock the client brief (PDF) and Agent 2 preview sites.
```

### Store icon (128×128) — required

Upload this file:

```
apps/extension-fiverr/store-assets/icon128.png
```

Full path:

```
C:\Users\kosta\Desktop\gigster_website\apps\extension-fiverr\store-assets\icon128.png
```

### Screenshots — at least 1 required (1280×800 or 640×400)

Upload this file:

```
apps/extension-fiverr/store-assets/screenshot-1280x800.png
```

Full path:

```
C:\Users\kosta\Desktop\gigster_website\apps\extension-fiverr\store-assets\screenshot-1280x800.png
```

---

## Privacy practices tab

| Question | Answer |
|----------|--------|
| **Single purpose** | Draft AI replies for Fiverr seller inbox messages on behalf of the logged-in Gigster member. |
| **Privacy policy URL** | `https://www.gigster.website/tos` |
| **Uses remote code?** | No (extension calls Gigster API; no arbitrary remote scripts). |
| **Data collected** | Account credentials (login), inbox message text sent to Gigster API for drafting, extension settings stored locally. |
| **Data use** | To authenticate the member and generate reply drafts via Gigster backend. |
| **Data shared** | Message text is sent to Gigster servers (Railway API) for AI processing — not sold to third parties. |

If Google shows permission justification forms:

| Permission | Justification |
|------------|----------------|
| `storage` | Save login session and extension preferences. |
| `tabs` | Detect when member is on Fiverr inbox. |
| `scripting` | Read inbox message text to send drafts to Gigster API. |
| `alarms` | Background polling for new messages in Auto mode. |
| `host_permissions` (fiverr.com) | Operate on Fiverr inbox pages only. |
| `host_permissions` (gigster API) | Connect to Gigster backend for auth and AI drafts. |

---

## Distribution tab

| Setting | Value |
|---------|--------|
| **Visibility** | Public (or Unlisted for soft launch) |
| **Regions** | All regions (or your choice) |

---

## Account / homepage (if asked)

| Field | Value |
|-------|--------|
| **Official URL** | `https://www.gigster.website` |
| **Support URL** (optional) | `https://www.gigster.website/guide` |

Do **not** use personal Gmail as public contact email.

---

## Submit

When all required fields show no errors → **Submit for review** (top right).

Review usually takes 1–7 days.

---

## After approval

1. Install from Store (or check listing ID in Developer Dashboard).
2. Open `chrome://extensions` → copy **Extension ID**.
3. Railway → `@gigster/backend` → **Variables** → update `CORS_EXTENSION_IDS` with the Store ID.
4. **Redeploy** backend.

Store extension ID differs from dev Load unpacked ID when manifest `key` is omitted in store zip.
