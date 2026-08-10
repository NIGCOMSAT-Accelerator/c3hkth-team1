import numpy as np
import pandas as pd
import pytest

from aquawatch.features.build_features import (
    FEATURE_COLUMNS,
    FeatureValidationError,
    build_feature_matrix,
    impute_missing_features,
    validate_training_dataset,
)


def test_validate_training_dataset_raises_on_missing_columns():
    df = pd.DataFrame({"water_fraction": [0.1]})
    with pytest.raises(FeatureValidationError):
        validate_training_dataset(df)


def test_validate_training_dataset_raises_on_empty_dataframe(sample_training_dataset):
    empty_df = sample_training_dataset.iloc[0:0]
    with pytest.raises(FeatureValidationError):
        validate_training_dataset(empty_df)


def test_impute_missing_features_fills_with_median(sample_training_dataset):
    df = sample_training_dataset.copy()
    df.loc[0, "water_fraction"] = np.nan

    imputed = impute_missing_features(df)

    assert imputed["water_fraction"].isna().sum() == 0
    expected_median = df["water_fraction"].median()
    assert imputed.loc[0, "water_fraction"] == pytest.approx(expected_median)


def test_build_feature_matrix_returns_expected_shape(sample_training_dataset):
    features, target = build_feature_matrix(sample_training_dataset)

    assert list(features.columns) == FEATURE_COLUMNS
    assert len(features) == len(sample_training_dataset)
    assert set(target.unique()).issubset({0, 1})
