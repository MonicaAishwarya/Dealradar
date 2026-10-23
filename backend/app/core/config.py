from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "DealRadar Intelligence OS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./dealradar.db"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:4173,http://localhost:3000"

    MAX_UPLOAD_SIZE_MB: int = 50

    # Risk thresholds
    RISK_LOW_MAX: int = 30
    RISK_MEDIUM_MAX: int = 60
    RISK_HIGH_MAX: int = 85
    # above HIGH_MAX = CRITICAL

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
