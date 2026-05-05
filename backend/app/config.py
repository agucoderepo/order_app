from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    app_name: str = "Order Management App"
    debug: bool = False

    # Database
    database_url: str = "sqlite:///./order_app.db"

    # Auth
    secret_key: str = "c3959134873ad3f293f7cdc874aed4efe38ab086361cda58c9acacd959e8c42c"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # Google OAuth (optional — leave empty to disable)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Anthropic API (for WhatsApp parsing)
    anthropic_api_key: str = ""

    # PDF output directory
    pdf_output_dir: str = "./static/pdfs"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()