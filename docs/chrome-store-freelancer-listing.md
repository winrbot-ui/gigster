# Chrome Web Store — Gigster Freelancer

Copy-paste guide. Developer Dashboard → **New item** → upload zip → **Store listing**.

---

## Upload package first

```
C:\Users\kosta\Desktop\gigster_website\release\gigster-freelancer.zip
```

(Run `npm run build:extension:store` if missing.)

---

## Store listing tab

| Field | Value |
|-------|--------|
| **Title** | `Gigster Freelancer` |
| **Summary** | Copy block A |
| **Description** | Copy block B |
| **Category** | `Productivity` |
| **Language** | `English` |

### Block A — Summary

```
AI drafts Freelancer.com client replies in your voice. Free until your first deal — membership unlocks brief + preview site.
```

### Block B — Description

```
Gigster drafts every Freelancer.com client reply in your voice — so you can focus on closing deals, not typing.

• Agent 1 writes on-brand replies from your inbox
• Manual mode: you review and send each draft (default)
• Optional Auto mode: opt-in only, with ban-risk disclaimer
• Tracks negotiation and brief readiness
• Free until your first closed client

Requires a Gigster account (invite-only). Sign up at https://www.gigster.website, set your persona, then log in through the extension popup.

After your first deal, activate membership to unlock the client brief (PDF) and Agent 2 preview sites.
```

### Store icon (128×128)

```
C:\Users\kosta\Desktop\gigster_website\apps\extension-freelancer\store-assets\icon128.png
```

### Screenshot (1280×800 required)

```
C:\Users\kosta\Desktop\gigster_website\apps\extension-freelancer\store-assets\screenshot-1280x800.png
```

### Additional fields

| Field | Value |
|-------|--------|
| **Homepage URL** | `https://www.gigster.website` |
| **Support URL** | `https://www.gigster.website/guide` |
| **Official URL** | None (or add site in Search Console later) |
| **Mature content** | Off |

---

## Privacy practices tab

**All copy-paste text:** `docs/chrome-store-freelancer-privacy-paste.md`

**Data usage checkboxes:**
- **Website content** — YES
- **User activity** — YES (if shown)
- Location — NO
- Web history — NO

**Certifications:** check **all 3** boxes.

**Privacy policy URL:** `https://www.gigster.website/tos`

---

## Account Settings

Contact email must be **added and verified** (same publisher account as Fiverr — usually already done).

---

## Distribution

**Public** (or Unlisted for soft launch).

---

## Submit

**Save draft** → **Submit for review**

---

## After approval — Railway CORS

Copy **Item ID** from the Freelancer listing page, then Railway → `@gigster/backend` → **Variables**:

```
CORS_EXTENSION_IDS=bmekdhfojkicjmcnbackggnnggbidlbe,YOUR_FREELANCER_ITEM_ID
```

(Keep Fiverr Store ID + add Freelancer Store ID, comma-separated.)

Dev Load unpacked ID (optional): `mkmliddnbpnadmcpcjfinanpfajeiema`

Redeploy backend.
