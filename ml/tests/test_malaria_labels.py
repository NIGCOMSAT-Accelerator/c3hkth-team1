from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from aquawatch.ingestion.malaria_labels import MalariaLabelsValidationError, load_malaria_labels


def _write_csv(path: Path, rows: list[dict]) -> Path:
    pd.DataFrame(rows).to_csv(path, index=False)
    return path


def test_load_malaria_labels_parses_valid_csv(tmp_path: Path):
    csv_path = _write_csv(
        tmp_path / "labels.csv",
        [
            {
                "ward_external_code": "ward-001",
                "period_start": "2023-01-01",
                "period_end": "2023-01-31",
                "incidence_per_1000": 12.5,
                "outbreak_flag": True,
                "source": "DHS-MIS-2023",
            }
        ],
    )

    df = load_malaria_labels(csv_path)

    assert len(df) == 1
    assert df.loc[0, "outbreak_flag"] is np.bool_(True) or df.loc[0, "outbreak_flag"] == True  # noqa: E712


def test_load_malaria_labels_raises_on_missing_columns(tmp_path: Path):
    csv_path = _write_csv(tmp_path / "labels.csv", [{"ward_external_code": "ward-001"}])

    with pytest.raises(MalariaLabelsValidationError):
        load_malaria_labels(csv_path)


def test_load_malaria_labels_raises_when_period_end_before_start(tmp_path: Path):
    csv_path = _write_csv(
        tmp_path / "labels.csv",
        [
            {
                "ward_external_code": "ward-001",
                "period_start": "2023-02-01",
                "period_end": "2023-01-01",
                "incidence_per_1000": 5.0,
                "outbreak_flag": False,
                "source": "DHS-MIS-2023",
            }
        ],
    )

    with pytest.raises(MalariaLabelsValidationError):
        load_malaria_labels(csv_path)
