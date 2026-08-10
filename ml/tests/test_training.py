from pathlib import Path

from aquawatch.training.train_model import (
    feature_importances,
    load_model,
    save_model,
    train_malaria_risk_model,
)


def test_train_malaria_risk_model_returns_model_and_metrics(sample_training_dataset):
    model, metrics = train_malaria_risk_model(sample_training_dataset)

    assert hasattr(model, "predict")
    assert "accuracy" in metrics
    assert "f1_score" in metrics
    assert 0.0 <= metrics["accuracy"] <= 1.0


def test_feature_importances_sums_positive(sample_training_dataset):
    model, _ = train_malaria_risk_model(sample_training_dataset)
    importances = feature_importances(model)

    assert set(importances.keys()) == {"water_fraction", "rainfall_anomaly_mm", "population_density"}
    assert sum(importances.values()) > 0


def test_save_and_load_model_round_trip(sample_training_dataset, tmp_path: Path):
    model, _ = train_malaria_risk_model(sample_training_dataset)
    output_path = tmp_path / "model.joblib"

    saved_path = save_model(model, output_path)
    loaded_model = load_model(saved_path)

    assert saved_path.exists()
    assert hasattr(loaded_model, "predict")
