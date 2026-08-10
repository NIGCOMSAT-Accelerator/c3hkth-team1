from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RiskLabel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class PredictionRequest(BaseModel):
    ward_id: str
    water_fraction: float = Field(ge=0.0, le=1.0)
    rainfall_anomaly_mm: float
    population_density: float = Field(ge=0.0)


class PredictionResponse(BaseModel):
    ward_id: str
    risk_score: float
    risk_label: RiskLabel
    contributing_factors: dict[str, float]


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_loaded: bool
