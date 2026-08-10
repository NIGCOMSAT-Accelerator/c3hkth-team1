from datetime import date
from pathlib import Path

import rasterio
import requests
from rasterstats import zonal_stats

from aquawatch.ingestion.base import WardObservation


class CHIRPSClientError(RuntimeError):
    pass


class CHIRPSClient:
    def __init__(self, base_url: str, cache_dir: Path):
        self._base_url = base_url.rstrip("/")
        self._cache_dir = cache_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)

    def raster_filename(self, period: date) -> str:
        return f"chirps-v2.0.{period.year}.{period.month:02d}.tif.gz"

    def download_monthly_raster(self, period: date) -> Path:
        filename = self.raster_filename(period)
        destination = self._cache_dir / filename

        if destination.exists():
            return destination

        url = f"{self._base_url}/{filename}"
        response = requests.get(url, timeout=60)
        if response.status_code != 200:
            raise CHIRPSClientError(f"failed to download {url}: status {response.status_code}")

        destination.write_bytes(response.content)
        return destination

    @staticmethod
    def _rasterio_path(raster_path: Path) -> str:
        if raster_path.suffix == ".gz":
            return f"/vsigzip/{raster_path}"
        return str(raster_path)

    def zonal_mean_rainfall_mm(self, raster_path: Path, ward_geometry) -> float:
        readable_path = self._rasterio_path(raster_path)

        with rasterio.open(readable_path) as src:
            stats = zonal_stats(
                [ward_geometry],
                readable_path,
                stats=["mean"],
                nodata=src.nodata,
                affine=src.transform,
            )

        if not stats or stats[0]["mean"] is None:
            raise CHIRPSClientError("zonal statistics returned no valid pixels for ward geometry")

        return float(stats[0]["mean"])

    def fetch_rainfall_anomaly(
        self,
        ward_external_code: str,
        ward_geometry,
        current_period: date,
        baseline_periods: list[date],
    ) -> WardObservation:
        current_raster = self.download_monthly_raster(current_period)
        current_mean = self.zonal_mean_rainfall_mm(current_raster, ward_geometry)

        baseline_means = []
        for period in baseline_periods:
            raster_path = self.download_monthly_raster(period)
            baseline_means.append(self.zonal_mean_rainfall_mm(raster_path, ward_geometry))

        baseline_average = sum(baseline_means) / len(baseline_means)
        anomaly = current_mean - baseline_average

        return WardObservation(
            ward_external_code=ward_external_code,
            source="chirps",
            observed_on=current_period,
            metric_name="rainfall_anomaly_mm",
            metric_value=anomaly,
            raw_payload={"current_mean_mm": current_mean, "baseline_average_mm": baseline_average},
        )
