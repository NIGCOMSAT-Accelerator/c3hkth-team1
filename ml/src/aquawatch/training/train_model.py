from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from aquawatch.features.build_features import FEATURE_COLUMNS, build_feature_matrix

DEFAULT_MODEL_PARAMS = {
    "n_estimators": 200,
    "max_depth": 4,
    "learning_rate": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "colsample_bynode": 0.67,
    "eval_metric": "logloss",
    "random_state": 42,
}


def train_malaria_risk_model(
    training_df: pd.DataFrame,
    model_params: dict | None = None,
    test_size: float = 0.2,
    random_state: int = 42,
) -> tuple[XGBClassifier, dict]:
    features, target = build_feature_matrix(training_df)

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=random_state,
        stratify=target if target.nunique() > 1 else None,
    )

    params = {**DEFAULT_MODEL_PARAMS, **(model_params or {})}
    model = XGBClassifier(**params)
    model.fit(x_train, y_train)

    metrics = evaluate_model(model, x_test, y_test)
    return model, metrics


def evaluate_model(model: XGBClassifier, x_test: pd.DataFrame, y_test: pd.Series) -> dict:
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

    predictions = model.predict(x_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "f1_score": float(f1_score(y_test, predictions, zero_division=0)),
    }

    if y_test.nunique() > 1:
        probabilities = model.predict_proba(x_test)[:, 1]
        metrics["roc_auc"] = float(roc_auc_score(y_test, probabilities))

    return metrics


def feature_importances(model: XGBClassifier) -> dict[str, float]:
    return dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist(), strict=True))


def save_model(model: XGBClassifier, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)
    return output_path


def load_model(model_path: Path) -> XGBClassifier:
    return joblib.load(model_path)
