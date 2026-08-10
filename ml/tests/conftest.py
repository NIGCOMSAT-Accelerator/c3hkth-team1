import os

import pandas as pd
import pytest


@pytest.fixture(autouse=True)
def _required_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/testdb")


@pytest.fixture
def sample_training_dataset() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "ward_id": [f"ward-{i}" for i in range(30)],
            "water_fraction": [0.1 * (i % 10) for i in range(30)],
            "rainfall_anomaly_mm": [5.0 * (i % 6) - 10.0 for i in range(30)],
            "population_density": [200.0 + 15.0 * (i % 8) for i in range(30)],
            "outbreak_flag": [1 if i % 3 == 0 else 0 for i in range(30)],
        }
    )
