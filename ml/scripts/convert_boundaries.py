import sys
from pathlib import Path

import geopandas as gpd

LGA_ADMIN_LEVEL = 2

STATE_FIELD_CANDIDATES = ["adm1_name", "admin1Name_en", "ADM1_EN", "statename", "state"]
LGA_FIELD_CANDIDATES = ["adm2_name", "admin2Name_en", "ADM2_EN", "lganame", "LGA"]
LEVEL_FIELD_CANDIDATES = ["adm_p_lvl", "admin_level", "level"]


def find_field(columns: list[str], candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: python convert_boundaries.py <raw_input.geojson> <output_path.geojson>")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    gdf = gpd.read_file(input_path)
    columns = list(gdf.columns)

    level_field = find_field(columns, LEVEL_FIELD_CANDIDATES)
    if level_field is not None:
        gdf = gdf[gdf[level_field] == LGA_ADMIN_LEVEL].copy()
        if gdf.empty:
            raise SystemExit(
                f"no features had {level_field} == {LGA_ADMIN_LEVEL}; "
                f"check the actual values in that column, e.g. gdf['{level_field}'].unique()"
            )

    state_field = find_field(columns, STATE_FIELD_CANDIDATES)
    lga_field = find_field(columns, LGA_FIELD_CANDIDATES)

    if state_field is None or lga_field is None:
        raise SystemExit(
            f"could not find state/lga fields.\n"
            f"tried state: {STATE_FIELD_CANDIDATES}\n"
            f"tried lga: {LGA_FIELD_CANDIDATES}\n"
            f"actual columns available: {columns}"
        )

    gdf = gdf.copy()
    gdf["state"] = gdf[state_field]
    gdf["lga_name"] = gdf[lga_field]
    gdf["ward_name"] = gdf[lga_field]

    output_gdf = gdf[["state", "lga_name", "ward_name", "geometry"]]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_gdf.to_file(output_path, driver="GeoJSON")

    print(f"wrote {len(output_gdf)} features to {output_path}")
    print(f"states included: {sorted(output_gdf['state'].unique())}")


if __name__ == "__main__":
    main()
