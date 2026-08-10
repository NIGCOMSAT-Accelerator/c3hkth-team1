from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    model_path: Path = Path("app/model/malaria_risk_xgb.joblib")
    low_risk_threshold: float = 0.33
    high_risk_threshold: float = 0.66
    port: int = 8000


@lru_cache
def get_settings() -> Settings:
    return Settings()
