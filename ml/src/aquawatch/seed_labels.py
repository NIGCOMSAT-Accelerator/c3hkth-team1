import sys
from pathlib import Path

from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine
from aquawatch.ingestion.malaria_labels import load_malaria_labels


def main() -> None:
    settings = get_settings()
    labels_path = Path(sys.argv[1]) if len(sys.argv) > 1 else settings.malaria_labels_csv_path

    df = load_malaria_labels(labels_path)
    engine = build_engine(settings.database_url)

    inserted = 0
    skipped_unknown_ward: list[str] = []

    with engine.begin() as connection:
        for _, row in df.iterrows():
            ward_result = connection.execute(
                text("select id from wards where external_code = :external_code"),
                {"external_code": row["ward_external_code"]},
            )
            ward_row = ward_result.first()

            if ward_row is None:
                skipped_unknown_ward.append(row["ward_external_code"])
                continue

            connection.execute(
                text(
                    """
                    insert into malaria_incidence_labels
                        (ward_id, period_start, period_end, incidence_per_1000, outbreak_flag, source)
                    values
                        (:ward_id, :period_start, :period_end, :incidence_per_1000, :outbreak_flag, :source)
                    on conflict (ward_id, period_start, period_end) do update set
                        incidence_per_1000 = excluded.incidence_per_1000,
                        outbreak_flag = excluded.outbreak_flag,
                        source = excluded.source
                    """
                ),
                {
                    "ward_id": ward_row[0],
                    "period_start": row["period_start"],
                    "period_end": row["period_end"],
                    "incidence_per_1000": row["incidence_per_1000"],
                    "outbreak_flag": bool(row["outbreak_flag"]),
                    "source": row["source"],
                },
            )
            inserted += 1

    print(f"upserted {inserted} malaria label rows from {labels_path}")
    if skipped_unknown_ward:
        print(f"skipped {len(skipped_unknown_ward)} rows with no matching ward (run seed_wards first):")
        for code in skipped_unknown_ward[:10]:
            print(f"  {code}")


if __name__ == "__main__":
    main()
