# Extension — dev vs client (не мешај ги)

Две целосно одделни патеки:

| | **Dev (внатрешно тестирање)** | **Client (што им го даваш на клиенти)** |
|---|---|---|
| Команда | `npm run extension:dev:fiverr` | `npm run extension:client` |
| Output | `apps/extension-fiverr/dist/` | `release/gigster-fiverr.zip` |
| API | `http://localhost:8000` | Production Railway API |
| Chrome | Load unpacked (developer mode) | Chrome Web Store upload |
| Manifest | `localhost` во host_permissions | `localhost` се отстранува |
| Marker | `DEV-NOT-FOR-CLIENTS.txt` во dist | нема marker |

## Dev — само за тебе (локално)

```bash
# 1. Backend + web
npm run dev:api
npm run dev

# 2. Build unpacked extension (localhost API)
npm run extension:dev:fiverr
# или
npm run extension:dev:freelancer

# 3. Chrome → Load unpacked → apps/extension-fiverr/dist

# 4. Backend .env (dev only)
CORS_EXTENSION_IDS=lfmmjponcopmghlpgmfgpnjeegbfbjeg,mkmliddnbpnadmcpcjfinanpfajeiema
```

**Без екстензија** — Agent 1/2 симулатор (ист API, не е client deliverable):

`http://localhost:3000/dev/simulator`

## Client — што оди кон Chrome Web Store

```bash
npm run extension:client
```

- Генерира production `config.local.js`
- Брише dev marker
- Отстранува `localhost` од manifest
- Zip во `release/` — **само ова upload-ирај**

После publish, додај го Store extension ID во Railway `CORS_EXTENSION_IDS`.

## Правило

- Никогаш не праќај `apps/extension-*/dist` на клиенти.
- Никогаш не upload-ирај zip што содржи `DEV-NOT-FOR-CLIENTS.txt` или `localhost` API.
