from pathlib import Path

import joblib
import numpy as np

from app.schemas import PredictionRequest, PredictionResponse, RiskLabel

FEATURE_ORDER = ["water_fraction", "rainfall_anomaly_mm", "population_density"]


class ModelNotLoadedError(RuntimeError):
    pass


class ModelService:
    def __init__(self, model_path: Path, low_risk_threshold: float, high_risk_threshold: float):
        self._model_path = model_path
        self._low_risk_threshold = low_risk_threshold
        self._high_risk_threshold = high_risk_threshold
        self._model = None

    def load(self) -> None:
        if not self._model_path.exists():
            raise ModelNotLoadedError(f"model file not found at {self._model_path}")
        self._model = joblib.load(self._model_path)

    @property
    def is_loaded(self) -> bool:
        return self._model is not None

    def _feature_vector(self, request: PredictionRequest) -> np.ndarray:
        return np.array(
            [[request.water_fraction, request.rainfall_anomaly_mm, request.population_density]]
        )

    def _risk_label(self, risk_score: float) -> RiskLabel:
        if risk_score < self._low_risk_threshold:
            return RiskLabel.LOW
        if risk_score < self._high_risk_threshold:
            return RiskLabel.MODERATE
        return RiskLabel.HIGH

    def _contributing_factors(self, request: PredictionRequest) -> dict[str, float]:
        importances = getattr(self._model, "feature_importances_", None)
        if importances is None:
            return {}

        raw_values = np.array(
            [request.water_fraction, abs(request.rainfall_anomaly_mm), request.population_density]
        )
        weighted = importances * (raw_values + 1e-9)
        total = weighted.sum()

        if total <= 0:
            return dict.fromkeys(FEATURE_ORDER, 0.0)

        normalized = weighted / total
        return {name: float(value) for name, value in zip(FEATURE_ORDER, normalized, strict=True)}

    def predict(self, request: PredictionRequest) -> PredictionResponse:
        if not self.is_loaded:
            raise ModelNotLoadedError("model has not been loaded, call load() first")

        features = self._feature_vector(request)
        risk_score = float(self._model.predict_proba(features)[0][1])

        return PredictionResponse(
            ward_id=request.ward_id,
            risk_score=risk_score,
            risk_label=self._risk_label(risk_score),
            contributing_factors=self._contributing_factors(request),
        )
