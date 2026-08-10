from pathlib import Path

from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.model_service import ModelService


def _client_with_loaded_model(model_path: Path) -> TestClient:
    service = ModelService(model_path=model_path, low_risk_threshold=0.33, high_risk_threshold=0.66)
    service.load()
    main_module.model_service = service
    return TestClient(app)


def test_health_reports_model_not_loaded_by_default():
    main_module.model_service = None
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["model_loaded"] is False


def test_health_reports_model_loaded(trained_model_path: Path):
    client = _client_with_loaded_model(trained_model_path)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["model_loaded"] is True


def test_predict_returns_503_when_model_not_loaded():
    main_module.model_service = None
    client = TestClient(app)

    response = client.post(
        "/predict",
        json={
            "ward_id": "ward-001",
            "water_fraction": 0.5,
            "rainfall_anomaly_mm": 10.0,
            "population_density": 300.0,
        },
    )

    assert response.status_code == 503


def test_predict_returns_valid_payload(trained_model_path: Path):
    client = _client_with_loaded_model(trained_model_path)

    response = client.post(
        "/predict",
        json={
            "ward_id": "ward-001",
            "water_fraction": 0.7,
            "rainfall_anomaly_mm": 20.0,
            "population_density": 500.0,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["ward_id"] == "ward-001"
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["risk_label"] in {"low", "moderate", "high"}


def test_predict_rejects_out_of_range_water_fraction(trained_model_path: Path):
    client = _client_with_loaded_model(trained_model_path)

    response = client.post(
        "/predict",
        json={
            "ward_id": "ward-001",
            "water_fraction": 1.5,
            "rainfall_anomaly_mm": 10.0,
            "population_density": 300.0,
        },
    )

    assert response.status_code == 422
