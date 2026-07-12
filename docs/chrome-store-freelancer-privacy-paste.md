# Chrome Web Store — Freelancer Privacy practices (COPY-PASTE)

Open: **Gigster Freelancer** → left sidebar → **Privacy practices**

---

## Privacy policy URL

```
https://www.gigster.website/tos
```

---

## Single purpose description

```
Draft AI replies for Freelancer.com seller inbox messages. The extension helps logged-in Gigster members write on-brand client replies from their Freelancer inbox. Manual mode is the default; the member reviews each draft before sending. Optional Auto mode requires explicit opt-in and a ban-risk disclaimer.
```

---

## Remote code use — justification

```
No remote code is executed. The extension only sends HTTPS requests to the Gigster API (gigsterbackend-production.up.railway.app) and receives draft text as JSON. No external JavaScript or other executable code is downloaded or run in the browser.
```

Answer **No** if asked separately whether the extension uses remote code.

---

## Storage — justification

```
Store the member login session (tokens) and extension settings (manual/auto mode, user preferences) locally so the user stays signed in and settings persist between browser sessions.
```

---

## Tabs — justification

```
Detect when the member has a Freelancer.com inbox tab open so the extension only runs on the correct Freelancer pages and can show the correct status in the popup.
```

---

## Scripting — justification

```
Read visible inbox message text on Freelancer.com pages the member is already viewing, so that text can be sent to the Gigster API to generate a reply draft. The member must be logged into Gigster and must press Start in the extension popup.
```

---

## Alarms — justification

```
Schedule periodic background checks only when the member has enabled Auto mode and started the extension, to detect new unanswered Freelancer inbox messages. Alarms are not scheduled when the extension is stopped.
```

---

## Host permission — justification

```
Host access is limited to: (1) Freelancer.com and freelancer.com.au inbox pages where drafting runs, (2) gigster.website for account-related flows, and (3) gigsterbackend-production.up.railway.app for member authentication and AI draft generation. The extension does not access unrelated websites.
```

---

## Data usage checkboxes

Check:
- **Website content** — reads Freelancer inbox messages for drafting
- **User activity** — if required for tabs/scripting disclosure

Do **not** check Location or Web history.

---

## Certifications

Check **all three** certification boxes at the bottom (“You must certify all three”).

---

## Contact email

**Account → Settings** → contact email added + **verified** (same Google developer account).

---

## Submit

**Save draft** → **Submit for review**

---

## Railway after approve

Add Freelancer **Item ID** to `CORS_EXTENSION_IDS` alongside Fiverr:

```
CORS_EXTENSION_IDS=bmekdhfojkicjmcnbackggnnggbidlbe,FREELANCER_ITEM_ID_HERE
```

Redeploy `@gigster/backend`.
