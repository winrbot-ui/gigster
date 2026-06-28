from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import ai, notifications, cron, desktop, agent2, telegram_webhook

app = FastAPI(title="Gigster API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)
app.include_router(notifications.router)
app.include_router(cron.router)
app.include_router(desktop.router)
app.include_router(agent2.router)
app.include_router(telegram_webhook.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gigster-api"}
