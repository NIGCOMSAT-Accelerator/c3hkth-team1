from pathlib import Path

import pytest

from app.model_service import ModelNotLoadedError, ModelService
from app.schemas import PredictionRequest, RiskLabel


def _build_service(model_path: Path) -> ModelService:
    return ModelService(model_path=model_path, low_risk_threshold=0.33, high_risk_threshold=0.66)


def test_predict_raises_when_model_not_loaded(trained_model_path: Path):
    service = _build_service(trained_model_path)
    request = PredictionRequest(
        ward_id="ward-001", water_fraction=0.5, rainfall_anomaly_mm=10.0, population_density=300.0
    )

    with pytest.raises(ModelNotLoadedError):
        service.predict(request)


def test_load_raises_when_file_missing(tmp_path: Path):
    service = _build_service(tmp_path / "does-not-exist.joblib")

    with pytest.raises(ModelNotLoadedError):
        service.load()


def test_predict_returns_valid_response(trained_model_path: Path):
    service = _build_service(trained_model_path)
    service.load()

    request = PredictionRequest(
        ward_id="ward-001", water_fraction=0.8, rainfall_anomaly_mm=15.0, population_density=400.0
    )
    response = service.predict(request)

    assert response.ward_id == "ward-001"
    assert 0.0 <= response.risk_score <= 1.0
    assert response.risk_label in {RiskLabel.LOW, RiskLabel.MODERATE, RiskLabel.HIGH}
    assert set(response.contributing_factors.keys()) == {
        "water_fraction",
        "rainfall_anomaly_mm",
        "population_density",
    }
    assert all(value >= 0.0 for value in response.contributing_factors.values())


def test_risk_label_boundaries_are_respected(trained_model_path: Path):
    service = _build_service(trained_model_path)

    assert service._risk_label(0.0) == RiskLabel.LOW
    assert service._risk_label(0.32) == RiskLabel.LOW
    assert service._risk_label(0.33) == RiskLabel.MODERATE
    assert service._risk_label(0.65) == RiskLabel.MODERATE
    assert service._risk_label(0.66) == RiskLabel.HIGH
    assert service._risk_label(1.0) == RiskLabel.HIGH


def test_contributing_factors_sum_to_approximately_one(trained_model_path: Path):
    service = _build_service(trained_model_path)
    service.load()

    request = PredictionRequest(
        ward_id="ward-002", water_fraction=0.6, rainfall_anomaly_mm=-5.0, population_density=250.0
    )
    response = service.predict(request)

    assert sum(response.contributing_factors.values()) == pytest.approx(1.0, abs=1e-6)
