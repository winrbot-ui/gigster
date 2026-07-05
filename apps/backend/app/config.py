from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../web/.env.local"),
        extra="ignore",
    )

    supabase_url: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    )
    supabase_service_role_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY",
            "SUPABASE_SERVICE_KEY",
        ),
    )
    supabase_jwt_secret: str = ""
    supabase_anon_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        ),
    )
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5-20250929"
    anthropic_stage_model: str = ""
    openai_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    vercel_token: str = ""
    vercel_team_id: str = ""
    vercel_agent2_project_name: str = "gigster-agent2-previews"
    agent2_domain: str = "gigsterr.online"
    cron_secret: str = ""
    cors_origins: str = "http://localhost:3000,https://gigster.website,https://www.gigster.website"
    cors_extension_ids: str = ""
    ai_required: bool = False
    resend_api_key: str = ""
    resend_from: str = "Gigster <noreply@gigster.website>"
    site_url: str = "https://www.gigster.website"


settings = Settings()
