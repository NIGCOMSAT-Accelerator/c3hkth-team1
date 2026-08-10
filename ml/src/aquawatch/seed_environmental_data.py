from datetime import date
from pathlib import Path

import geopandas as gpd
from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine
from aquawatch.ingestion.chirps import CHIRPSClient, CHIRPSClientError
from aquawatch.ingestion.sentinel1 import SentinelHubClientError, SentinelHubWaterFractionClient
from aquawatch.ingestion.worldpop import WorldPopClient, WorldPopClientError

CURRENT_PERIOD = date(2021, 9, 1)
CURRENT_PERIOD_END = date(2021, 9, 30)
BASELINE_PERIODS = [date(2020, 9, 1)]
POPULATION_YEAR = 2020


def load_wards_with_geometry(database_url: str) -> gpd.GeoDataFrame:
    engine = build_engine(database_url)
    query = "select id as ward_id, external_code, boundary as geometry from wards"
    return gpd.read_postgis(query, engine, geom_col="geometry")


def upsert_observation(connection, ward_id: str, source: str, observed_on: date, metric_name: str, value: float) -> None:
    connection.execute(
        text(
            """
            insert into environmental_observations (ward_id, source, observed_on, metric_name, metric_value)
            values (:ward_id, :source, :observed_on, :metric_name, :metric_value)
            on conflict (ward_id, source, observed_on, metric_name)
            do update set metric_value = excluded.metric_value
            """
        ),
        {
            "ward_id": ward_id,
            "source": source,
            "observed_on": observed_on,
            "metric_name": metric_name,
            "metric_value": value,
        },
    )


def main() -> None:
    settings = get_settings()
    wards = load_wards_with_geometry(settings.database_url)
    engine = build_engine(settings.database_url)

    cache_dir = Path("data/raw/rasters")
    chirps_client = CHIRPSClient(base_url=settings.chirps_base_url, cache_dir=cache_dir)
    worldpop_client = WorldPopClient(base_url=settings.worldpop_base_url, cache_dir=cache_dir)

    sentinel_client: SentinelHubWaterFractionClient | None = None
    if settings.sentinelhub_client_id and settings.sentinelhub_client_secret:
        sentinel_client = SentinelHubWaterFractionClient(
            client_id=settings.sentinelhub_client_id,
            client_secret=settings.sentinelhub_client_secret,
            instance_id=settings.sentinelhub_instance_id,
            base_url=settings.sentinelhub_base_url,
            token_url=settings.sentinelhub_token_url,
        )
    else:
        print("Sentinel Hub credentials not set — skipping water_fraction ingestion entirely.")

    rainfall_written = 0
    rainfall_failed = 0
    population_written = 0
    population_failed = 0
    water_written = 0
    water_failed = 0

    with engine.begin() as connection:
        for _, row in wards.iterrows():
            ward_id = row["ward_id"]
            geometry = row["geometry"]

            try:
                observation = chirps_client.fetch_rainfall_anomaly(
                    ward_external_code=row["external_code"],
                    ward_geometry=geometry,
                    current_period=CURRENT_PERIOD,
                    baseline_periods=BASELINE_PERIODS,
                )
                upsert_observation(
                    connection, ward_id, "chirps", observation.observed_on,
                    observation.metric_name, observation.metric_value,
                )
                rainfall_written += 1
            except CHIRPSClientError as error:
                rainfall_failed += 1
                print(f"CHIRPS failed for {row['external_code']}: {error}")

            try:
                area_sq_km = gpd.GeoSeries([geometry], crs="EPSG:4326").to_crs(epsg=3857).area.iloc[0] / 1_000_000
                observation = worldpop_client.fetch_population_density(
                    ward_external_code=row["external_code"],
                    ward_geometry=geometry,
                    ward_area_sq_km=area_sq_km,
                    year=POPULATION_YEAR,
                )
                upsert_observation(
                    connection, ward_id, "worldpop", observation.observed_on,
                    observation.metric_name, observation.metric_value,
                )
                population_written += 1
            except WorldPopClientError as error:
                population_failed += 1
                print(f"WorldPop failed for {row['external_code']}: {error}")

            if sentinel_client is not None:
                try:
                    observation = sentinel_client.fetch_water_fraction(
                        ward_external_code=row["external_code"],
                        ward_geometry=geometry,
                        start=CURRENT_PERIOD,
                        end=CURRENT_PERIOD_END,
                    )
                    upsert_observation(
                        connection, ward_id, "sentinel1", observation.observed_on,
                        observation.metric_name, observation.metric_value,
                    )
                    water_written += 1
                except SentinelHubClientError as error:
                    water_failed += 1
                    print(f"Sentinel Hub failed for {row['external_code']}: {error}")

    print(f"rainfall observations written: {rainfall_written}, failed: {rainfall_failed}")
    print(f"population observations written: {population_written}, failed: {population_failed}")
    if sentinel_client is not None:
        print(f"water observations written: {water_written}, failed: {water_failed}")


if __name__ == "__main__":
    main()
