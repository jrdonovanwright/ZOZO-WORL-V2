from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    environment: str = "development"
    log_level: str = "info"
    allowed_origins: List[str] = ["http://localhost:8081", "exp://localhost:8081"]

    openai_api_key: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    firebase_service_account: str = ""

    google_calendar_client_id: str = ""
    google_calendar_client_secret: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
