# Chrome Web Store — Privacy practices (COPY-PASTE)

Open: **Gigster Fiverr** → left sidebar → **Privacy practices**

Paste each block into the matching field. All text is English (required by Google).

---

## Privacy policy URL

```
https://www.gigster.website/tos
```

---

## Single purpose description (required)

```
Draft AI replies for Fiverr seller inbox messages. The extension helps logged-in Gigster members write on-brand client replies from their Fiverr inbox. Manual mode is the default; the member reviews each draft before sending. Optional Auto mode requires explicit opt-in and a ban-risk disclaimer.
```

---

## Remote code use — justification (required)

```
No remote code is executed. The extension only sends HTTPS requests to the Gigster API (gigsterbackend-production.up.railway.app) and receives draft text as JSON. No external JavaScript or other executable code is downloaded or run in the browser.
```

If asked **“Does your extension use remote code?”** → answer **No** (if that is a separate toggle).

---

## Storage — justification (required)

```
Store the member login session (tokens) and extension settings (manual/auto mode, user preferences) locally so the user stays signed in and settings persist between browser sessions.
```

---

## Tabs — justification (required)

```
Detect when the member has a Fiverr inbox tab open so the extension only runs on the correct Fiverr pages and can show the correct status in the popup.
```

---

## Scripting — justification (required)

```
Read visible inbox message text on Fiverr pages the member is already viewing, so that text can be sent to the Gigster API to generate a reply draft. The member must be logged into Gigster and must press Start in the extension popup.
```

---

## Alarms — justification (required)

```
Schedule periodic background checks only when the member has enabled Auto mode and started the extension, to detect new unanswered Fiverr inbox messages. Alarms are not scheduled when the extension is stopped.
```

---

## Host permission — justification (required)

```
Host access is limited to: (1) Fiverr inbox pages on fiverr.com where drafting runs, (2) gigster.website for account-related flows, and (3) gigsterbackend-production.up.railway.app for member authentication and AI draft generation. The extension does not access unrelated websites.
```

---

## Data usage (if form asks what you collect)

**Collected:**
- Account identifier and password (login only — sent to Gigster API for authentication)
- Fiverr inbox message text (sent to Gigster API to generate drafts)
- Extension settings (stored locally)

**Use:** Authenticate the member and generate reply drafts. Not sold to third parties.

**Certification checkbox (required):**  
Check: **“I certify that my data usage complies with the Chrome Web Store Developer Program Policies”**

---

## Account → Settings (separate from Privacy tab)

Google also requires (from “Unable to publish”):

1. Left menu **Account** → **Settings** (or **Profile**)
2. **Add contact email** — use an inbox you can open (e.g. your Gmail)
3. Open the email from Google → click **Verify**
4. Return to dashboard — email must show **verified**

This email may be shown publicly on the listing. Prefer a business address later; for launch, any verifiable email works.

---

## After Privacy + verified email

1. **Store listing** → **Save draft**
2. **Submit for review**

---

## Store extension ID (for Railway CORS)

From your draft listing **Item ID:**

```
bmekdhfojkicjmcnbackggnnggbidlbe
```

After approval, Railway → `@gigster/backend` → **Variables**:

```
CORS_EXTENSION_IDS=bmekdhfojkicjmcnbackggnnggbidlbe
```

(Add dev ID comma-separated if you still use Load unpacked:  
`lfmmjponcopmghlpgmfgpnjeegbfbjeg,bmekdhfojkicjmcnbackggnnggbidlbe`)

Redeploy backend.
