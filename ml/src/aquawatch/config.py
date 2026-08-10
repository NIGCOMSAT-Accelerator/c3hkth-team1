from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    database_url: str

    sentinelhub_client_id: str = ""
    sentinelhub_client_secret: str = ""
    sentinelhub_instance_id: str = ""
    sentinelhub_base_url: str = "https://sh.dataspace.copernicus.eu"
    sentinelhub_token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

    chirps_base_url: str = "https://data.chc.ucsb.edu/products/CHIRPS-2.0/africa_monthly/tifs"
    worldpop_base_url: str = "https://data.worldpop.org/GIS/Population/Global_2000_2020"

    ward_boundaries_geojson_path: Path = Path("data/raw/ward_boundaries.geojson")
    malaria_labels_csv_path: Path = Path("data/raw/malaria_incidence_labels.csv")

    target_states: str = "Kogi,Bayelsa,Anambra"

    model_output_path: Path = Path("data/models/malaria_risk_xgb.joblib")

    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "aquawatch-satellite-images"
    r2_public_url_base: str = ""

    @property
    def target_state_list(self) -> list[str]:
        return [state.strip() for state in self.target_states.split(",") if state.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
