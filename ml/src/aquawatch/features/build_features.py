import pandas as pd

FEATURE_COLUMNS = ["water_fraction", "rainfall_anomaly_mm", "population_density"]
TARGET_COLUMN = "outbreak_flag"

REQUIRED_COLUMNS = set(FEATURE_COLUMNS) | {TARGET_COLUMN}


class FeatureValidationError(ValueError):
    pass


def validate_training_dataset(df: pd.DataFrame) -> None:
    missing_columns = REQUIRED_COLUMNS - set(df.columns)
    if missing_columns:
        raise FeatureValidationError(f"training dataset is missing columns: {sorted(missing_columns)}")

    if df.empty:
        raise FeatureValidationError("training dataset is empty")


def impute_missing_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for column in FEATURE_COLUMNS:
        column_median = df[column].median()
        df[column] = df[column].fillna(column_median)
    return df


def build_feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    validate_training_dataset(df)
    df = impute_missing_features(df)

    features = df[FEATURE_COLUMNS]
    target = df[TARGET_COLUMN].astype(int)

    return features, target
