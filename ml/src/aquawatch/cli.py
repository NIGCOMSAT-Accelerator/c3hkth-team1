import argparse
import sys

import pandas as pd
from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine
from aquawatch.training.train_model import feature_importances, save_model, train_malaria_risk_model


def load_training_dataset() -> pd.DataFrame:
    settings = get_settings()
    engine = build_engine(settings.database_url)
    with engine.connect() as connection:
        return pd.read_sql(text("select * from training_dataset"), connection)


def run_training() -> int:
    settings = get_settings()
    training_df = load_training_dataset()

    model, metrics = train_malaria_risk_model(training_df)

    print("training metrics:", metrics)
    print("feature importances:", feature_importances(model))

    output_path = save_model(model, settings.model_output_path)
    print(f"model saved to {output_path}")

    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="aquawatch")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("train", help="train the malaria risk model against training_dataset view")

    args = parser.parse_args()

    if args.command == "train":
        return run_training()

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
