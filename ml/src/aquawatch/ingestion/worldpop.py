from datetime import date
from pathlib import Path

import rasterio
import requests
from rasterstats import zonal_stats

from aquawatch.ingestion.base import WardObservation


class WorldPopClientError(RuntimeError):
    pass


class WorldPopClient:
    def __init__(self, base_url: str, cache_dir: Path, country_iso3: str = "NGA"):
        self._base_url = base_url.rstrip("/")
        self._country_iso3 = country_iso3
        self._cache_dir = cache_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def raster_filename(self, year: int) -> str:
        return f"{self._country_iso3.lower()}_ppp_{year}_1km_Aggregated.tif"

    def download_population_raster(self, year: int) -> Path:
        filename = self.raster_filename(year)
        destination = self._cache_dir / filename

        if destination.exists():
            return destination

        url = f"{self._base_url}/{year}/{self._country_iso3.upper()}/{filename}"
        response = requests.get(url, timeout=120)
        if response.status_code != 200:
            raise WorldPopClientError(f"failed to download {url}: status {response.status_code}")

        destination.write_bytes(response.content)
        return destination

    def fetch_population_density(
        self, ward_external_code: str, ward_geometry, ward_area_sq_km: float, year: int
    ) -> WardObservation:
        raster_path = self.download_population_raster(year)

        with rasterio.open(raster_path) as src:
            stats = zonal_stats(
                [ward_geometry],
                raster_path,
                stats=["sum"],
                nodata=src.nodata,
                affine=src.transform,
            )

        if not stats or stats[0]["sum"] is None:
            raise WorldPopClientError("zonal statistics returned no valid pixels for ward geometry")

        population_estimate = float(stats[0]["sum"])
        density = population_estimate / ward_area_sq_km if ward_area_sq_km > 0 else 0.0

        return WardObservation(
            ward_external_code=ward_external_code,
            source="worldpop",
            observed_on=date(year, 1, 1),
            metric_name="population_density",
            metric_value=density,
            raw_payload={"population_estimate": population_estimate, "area_sq_km": ward_area_sq_km},
        )
