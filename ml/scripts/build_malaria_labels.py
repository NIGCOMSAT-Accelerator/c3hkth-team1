import csv
import sys
from pathlib import Path

import geopandas as gpd

from aquawatch.seed_wards import ward_external_code

STATE_PREVALENCE_PERCENT = {
    "Katsina": 29.0,
    "Kano": 26.0,
    "Jigawa": 25.0,
    "Yobe": 21.0,
    "Borno": 6.0,
    "Bauchi": 32.0,
    "Gombe": 18.0,
    "Kaduna": 16.0,
    "Kebbi": 49.0,
    "Sokoto": 36.0,
    "Zamfara": 37.0,
    "Niger": 21.0,
    "Federal Capital Territory": 19.0,
    "Nasarawa": 15.0,
    "Taraba": 18.0,
    "Adamawa": 11.0,
    "Plateau": 19.0,
    "Osun": 19.0,
    "Oyo": 21.0,
    "Benue": 18.0,
    "Kogi": 16.0,
    "Kwara": 6.0,
    "Lagos": 3.0,
    "Edo": 23.0,
    "Ondo": 27.0,
    "Ogun": 25.0,
    "Ekiti": 21.0,
    "Imo": 16.0,
    "Rivers": 9.0,
    "Delta": 10.0,
    "Bayelsa": 17.0,
    "Enugu": 24.0,
    "Anambra": 5.0,
    "Ebonyi": 26.0,
    "Abia": 15.0,
    "Akwa Ibom": 30.0,
    "Cross River": 24.0,
}

OUTBREAK_THRESHOLD_PERCENT = 15.0

SOURCE_LABEL = "NMIS 2021 (NMEP) state-level prevalence, applied uniformly per state as a baseline label"

PERIOD_START = "2021-06-01"
PERIOD_END = "2021-09-30"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: python build_malaria_labels.py <ward_boundaries.geojson> <output.csv>")

    boundaries_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    gdf = gpd.read_file(boundaries_path)

    missing_states = set(gdf["state"].unique()) - set(STATE_PREVALENCE_PERCENT.keys())
    if missing_states:
        raise SystemExit(f"no published prevalence configured for states: {sorted(missing_states)}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "ward_external_code",
                "period_start",
                "period_end",
                "incidence_per_1000",
                "outbreak_flag",
                "source",
            ]
        )

        for _, row in gdf.iterrows():
            state = row["state"]
            lga_name = row["lga_name"]
            prevalence_percent = STATE_PREVALENCE_PERCENT[state]
            incidence_per_1000 = prevalence_percent * 10
            outbreak_flag = prevalence_percent >= OUTBREAK_THRESHOLD_PERCENT

            writer.writerow(
                [
                    ward_external_code(state, lga_name),
                    PERIOD_START,
                    PERIOD_END,
                    incidence_per_1000,
                    outbreak_flag,
                    SOURCE_LABEL,
                ]
            )

    print(f"wrote {len(gdf)} label rows to {output_path}")


if __name__ == "__main__":
    main()
