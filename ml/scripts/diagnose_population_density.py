from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine


def main() -> None:
    settings = get_settings()
    engine = build_engine(settings.database_url)

    with engine.connect() as connection:
        result = connection.execute(
            text(
                """
                select metric_value
                from environmental_observations
                where source = 'worldpop' and metric_name = 'population_density'
                order by metric_value
                """
            )
        )
        values = [row[0] for row in result]

    if not values:
        print("no population_density rows found at all")
        return

    print(f"count: {len(values)}")
    print(f"min: {min(values)}")
    print(f"max: {max(values)}")
    print(f"distinct values: {len(set(values))}")
    print(f"first 10 sorted: {values[:10]}")
    print(f"last 10 sorted: {values[-10:]}")

    zero_count = sum(1 for v in values if v == 0)
    print(f"exactly zero: {zero_count}")

    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    print(f"mean: {mean}")
    print(f"variance: {variance}")


if __name__ == "__main__":
    main()
