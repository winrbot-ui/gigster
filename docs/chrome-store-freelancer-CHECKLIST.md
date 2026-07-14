# Chrome Web Store — Freelancer checklist

**Rejected for privacy policy?** Use `https://www.gigster.website/privacy` (not `/tos`). Deploy web first, then update Privacy practices URL in the dashboard.

## 1. Deploy web

`/privacy` must be live at `https://www.gigster.website/privacy` before resubmit.

## 2. Upload zip (optional — only if you changed extension code)

```
release/gigster-freelancer.zip
```

Build: `npm run build:extension:store`

## 3. Store listing

Copy from: `docs/chrome-store-freelancer-listing.md`

| Asset | Path |
|-------|------|
| Icon | `apps/extension-freelancer/store-assets/icon128.png` |
| Screenshot | `release/store-upload/gigster-freelancer-screenshot-1280x800.png` |

## 4. Privacy practices

Copy from: `docs/chrome-store-freelancer-privacy-paste.md`

- **Privacy policy URL:** `https://www.gigster.website/privacy`
- Website content ✅
- User activity ✅ (if shown)
- All 3 certifications ✅

## 5. Settings

Contact email verified (same Google developer account as Fiverr).

## 6. Submit

Save draft → Submit for review (do **not** appeal — fix the URL and resubmit).

## Item ID

`ckhdlpfhjhnhlehofdlcaclipfadldef`

## 7. Railway (after approve)

```
CORS_EXTENSION_IDS=bmekdhfojkicjmcnbackggnnggbidlbe,ckhdlpfhjhnhlehofdlcaclipfadldef
```

Redeploy `@gigster/backend`.
