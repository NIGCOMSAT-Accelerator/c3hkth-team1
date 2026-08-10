import re
import sys
from pathlib import Path

import geopandas as gpd
from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine


def slugify(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", value.upper()).strip("-")


def ward_external_code(state: str, lga_name: str) -> str:
    return f"{slugify(state)}-{slugify(lga_name)}"


def main() -> None:
    settings = get_settings()
    boundaries_path = Path(sys.argv[1]) if len(sys.argv) > 1 else settings.ward_boundaries_geojson_path

    gdf = gpd.read_file(boundaries_path)
    gdf = gdf.to_crs(epsg=4326)

    engine = build_engine(settings.database_url)

    lgas_inserted = 0
    wards_inserted = 0

    with engine.begin() as connection:
        for _, row in gdf.iterrows():
            state = row["state"]
            lga_name = row["lga_name"]
            ward_name = row["ward_name"]
            geometry_wkt = row.geometry.wkt

            lga_result = connection.execute(
                text(
                    """
                    insert into lgas (state, name, external_code)
                    values (:state, :name, :external_code)
                    on conflict (state, name) do update set name = excluded.name
                    returning id
                    """
                ),
                {
                    "state": state,
                    "name": lga_name,
                    "external_code": slugify(f"{state}-{lga_name}"),
                },
            )
            lga_id = lga_result.scalar_one()
            lgas_inserted += 1

            connection.execute(
                text(
                    """
                    insert into wards (lga_id, name, external_code, boundary)
                    values (:lga_id, :name, :external_code, ST_Multi(ST_GeomFromText(:geometry_wkt, 4326)))
                    on conflict (external_code) do update set
                        name = excluded.name,
                        boundary = excluded.boundary
                    """
                ),
                {
                    "lga_id": lga_id,
                    "name": ward_name,
                    "external_code": ward_external_code(state, lga_name),
                    "geometry_wkt": geometry_wkt,
                },
            )
            wards_inserted += 1

    print(f"upserted {lgas_inserted} lgas and {wards_inserted} wards from {boundaries_path}")


if __name__ == "__main__":
    main()
