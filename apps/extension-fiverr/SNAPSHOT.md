# Gigster Extension — стабилен snapshot v0.6.1

**Датум:** 2026-07-01  
**Верзија:** 0.6.1  
**Статус:** Стабилна Fiverr-only верзија (зачувана копија)

## Што работи

- Login преку backend (`http://localhost:8000`)
- **Fiverr only** — inbox queue (Start / Stop)
- **Manual** — AI draft, ти copy/paste & send (extension **не** праќа)
- **Auto** — AI draft + extension праќа на Fiverr
- Per-thread memory → Supabase (`conversation_messages`, `projects`)
- Agent 1: Extract + Draft на backend

## Како да ја вчиташ оваа копија

Chrome → `chrome://extensions` → Load unpacked → **`backup/бекап-v0.6.1/dist`**

(или копирај ја папката на друго место и вчитај `dist/`)

## Предуслови

```bash
npm run dev:api
# опционално: npm run db:extension
```

Login: `founder@gigster.local` (dev seed)

## Важни фајлови

| Фајл | Улога |
|------|--------|
| `src/background/service-worker.js` | Queue, Manual/Auto, Fiverr-only |
| `src/content/fiverr-inbox.js` | Чита/праќа на Fiverr |
| `src/popup/popup.js` | UI — Manual / Auto / Start |
| `manifest.json` | v0.6.1, Fiverr permissions |

## v0.6.1 fix

Manual mode **никогаш** не повикува `SEND_REPLY` — само Auto со `mode: "auto"`.
