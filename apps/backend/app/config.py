from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_webhook_secret: str = ""
    vercel_token: str = ""
    vercel_team_id: str = ""
    vercel_agent2_project_name: str = "gigster-agent2-previews"
    agent2_domain: str = "gigsterr.online"
    cron_secret: str = ""
    cors_origins: str = "http://localhost:3000,https://gigster.website"


settings = Settings()
