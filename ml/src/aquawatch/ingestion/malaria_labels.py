from pathlib import Path

import pandas as pd

REQUIRED_COLUMNS = {
    "ward_external_code",
    "period_start",
    "period_end",
    "incidence_per_1000",
    "outbreak_flag",
    "source",
}


class MalariaLabelsValidationError(ValueError):
    pass


def load_malaria_labels(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        raise MalariaLabelsValidationError(
            f"malaria labels file is missing required columns: {sorted(missing_columns)}"
        )

    df["period_start"] = pd.to_datetime(df["period_start"]).dt.date
    df["period_end"] = pd.to_datetime(df["period_end"]).dt.date
    df["outbreak_flag"] = df["outbreak_flag"].astype(bool)
    df["incidence_per_1000"] = df["incidence_per_1000"].astype(float)

    invalid_rows = df[df["period_end"] < df["period_start"]]
    if not invalid_rows.empty:
        raise MalariaLabelsValidationError(
            f"{len(invalid_rows)} rows have period_end before period_start"
        )

    return df.reset_index(drop=True)
