from pathlib import Path

import joblib
import numpy as np
import pytest
from xgboost import XGBClassifier


@pytest.fixture
def trained_model_path(tmp_path: Path) -> Path:
    rng = np.random.default_rng(42)
    x = rng.random((60, 3))
    y = (x[:, 0] + x[:, 1] > 1.0).astype(int)

    model = XGBClassifier(n_estimators=20, max_depth=3, eval_metric="logloss", random_state=42)
    model.fit(x, y)

    model_path = tmp_path / "model.joblib"
    joblib.dump(model, model_path)
    return model_path
