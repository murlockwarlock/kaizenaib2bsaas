from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    PROJECT_NAME: str = "KaizenAI"
    API_V1_STR: str = "/api/v1"

    # Database (SQLite for dev, PostgreSQL for production)
    DATABASE_URL: str = "sqlite:///./mvp.db"
    # Local development may create the schema automatically. Production
    # releases run the migration job before starting API processes.
    AUTO_CREATE_SCHEMA: bool = True

    # JWT Auth — SECRET_KEY is required, must be set in .env
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # KIE API — KIE_API_KEY is required, must be set in .env
    KIE_API_KEY: str = ""
    KIE_API_URL: str = "https://api.kie.ai"

    # Public backend URL for callbacks (e.g. Suno webhook)
    BASE_URL: str = ""
    CORS_ALLOW_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    KIE_CALLBACK_TOKEN: str = ""
    SUNO_CALLBACK_TOKEN: str = ""
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    YOOKASSA_WEBHOOK_TOKEN: str = ""
    YOOKASSA_CURRENCY: str = "RUB"
    BILLING_MIN_AMOUNT_RUB: float = 50.0
    AI_GENERATION_ENABLED: bool = True
    BILLING_ENABLED: bool = True

    # SMTP (Gmail App Password) — optional, falls back to console output
    SMTP_EMAIL: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USE_SSL: bool = True
    SMTP_FROM_NAME: str = "KaizenAI"
    REDIS_URL: str = "redis://127.0.0.1:6379/0"
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    CELERY_QUEUE_NAME: str = "ai_editor"
    CELERY_WORKER_CONCURRENCY: int = 2
    CELERY_TASK_SOFT_TIME_LIMIT: int = 20 * 60
    CELERY_TASK_TIME_LIMIT: int = 25 * 60
    CELERY_RECONCILIATION_INTERVAL_SECONDS: int = 60

    @property
    def celery_broker_url(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_result_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    APPLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""

    VK_CLIENT_ID: str = ""
    VK_CLIENT_SECRET: str = ""

    # Paths
    UPLOAD_DIR: str = "uploads"
    UPLOAD_MAX_BYTES: int = 100 * 1024 * 1024
    EXAMPLE_UPLOAD_MAX_BYTES: int = 100 * 1024 * 1024

    @property
    def cors_origins(self) -> list[str]:
        origins = [item.strip() for item in self.CORS_ALLOW_ORIGINS.split(",") if item.strip()]
        if self.BASE_URL:
            origins.append(self.public_base_url)
        return sorted(set(origins))

    @property
    def public_base_url(self) -> str:
        base = self.BASE_URL.rstrip("/")
        if base.endswith(self.API_V1_STR):
            base = base[: -len(self.API_V1_STR)]
        return base

settings = Settings()
