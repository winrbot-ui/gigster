from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ai, notifications, cron, agent2, telegram_webhook, auth_ext, ext

app = FastAPI(title="Gigster API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
extension_origins = [
    f"chrome-extension://{ext_id.strip()}"
    for ext_id in settings.cors_extension_ids.split(",")
    if ext_id.strip()
]
allow_origins = origins + extension_origins
if not allow_origins:
    allow_origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)
app.include_router(auth_ext.router)
app.include_router(ext.router)
app.include_router(notifications.router)
app.include_router(cron.router)
app.include_router(agent2.router)
app.include_router(telegram_webhook.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gigster-api"}
