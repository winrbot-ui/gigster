from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException
from app.config import settings
from app.services.referrals import run_referral_churn_clawback, run_referral_qualification
from app.services.agent2.worker import run_agent2

router = APIRouter(prefix="/cron", tags=["cron"])


def _verify_cron(x_cron_secret: str | None) -> None:
    if settings.cron_secret and x_cron_secret != settings.cron_secret:
        raise HTTPException(403, "Forbidden")


@router.post("/referrals/qualify")
async def qualify_referrals(x_cron_secret: str | None = Header(default=None)):
    _verify_cron(x_cron_secret)
    return await run_referral_qualification()


@router.post("/referrals/churn")
async def clawback_churned_referrals(x_cron_secret: str | None = Header(default=None)):
    _verify_cron(x_cron_secret)
    return await run_referral_churn_clawback()


class Agent2RetryRequest(BaseModel):
    project_id: str


@router.post("/agent2/retry")
async def retry_agent2(
    body: Agent2RetryRequest,
    x_cron_secret: str | None = Header(default=None),
):
    """Service/cron retry for failed Agent 2 builds."""
    _verify_cron(x_cron_secret)
    return await run_agent2(body.project_id)
