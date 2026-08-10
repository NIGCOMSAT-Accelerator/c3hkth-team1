from datetime import date
from pathlib import Path

import numpy as np
import rasterio
import responses
from rasterio.transform import from_origin
from shapely.geometry import box

from aquawatch.ingestion.chirps import CHIRPSClient


def _write_synthetic_raster(path: Path, fill_value: float) -> None:
    transform = from_origin(west=6.0, north=7.0, xsize=0.01, ysize=0.01)
    data = np.full((10, 10), fill_value, dtype="float32")

    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=10,
        width=10,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
        nodata=-9999.0,
    ) as dst:
        dst.write(data, 1)


def test_zonal_mean_rainfall_mm_returns_expected_mean(tmp_path: Path):
    raster_path = tmp_path / "chirps-v2.0.2024.01.tif"
    _write_synthetic_raster(raster_path, fill_value=120.0)

    client = CHIRPSClient(base_url="https://example.com/chirps", cache_dir=tmp_path)
    ward_geometry = box(6.02, 6.92, 6.06, 6.96)

    mean_rainfall = client.zonal_mean_rainfall_mm(raster_path, ward_geometry)

    assert mean_rainfall == 120.0


def test_zonal_mean_rainfall_mm_reads_gzip_compressed_raster(tmp_path: Path):
    import gzip
    import shutil

    raw_path = tmp_path / "raw.tif"
    _write_synthetic_raster(raw_path, fill_value=88.0)

    gz_path = tmp_path / "chirps-v2.0.2024.01.tif.gz"
    with open(raw_path, "rb") as f_in, gzip.open(gz_path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)

    client = CHIRPSClient(base_url="https://example.com/chirps", cache_dir=tmp_path)
    ward_geometry = box(6.02, 6.92, 6.06, 6.96)

    mean_rainfall = client.zonal_mean_rainfall_mm(gz_path, ward_geometry)

    assert mean_rainfall == 88.0


@responses.activate
def test_download_monthly_raster_caches_to_disk(tmp_path: Path):
    client = CHIRPSClient(base_url="https://example.com/chirps", cache_dir=tmp_path)
    period = date(2024, 3, 1)
    expected_filename = client.raster_filename(period)

    responses.add(
        responses.GET,
        f"https://example.com/chirps/{expected_filename}",
        body=b"fake-raster-bytes",
        status=200,
    )

    destination = client.download_monthly_raster(period)

    assert destination.exists()
    assert destination.read_bytes() == b"fake-raster-bytes"


def _write_synthetic_gzip_raster(path: Path, fill_value: float) -> None:
    import gzip
    import shutil

    raw_path = path.with_suffix("").with_suffix(".raw.tif")
    _write_synthetic_raster(raw_path, fill_value)

    with open(raw_path, "rb") as f_in, gzip.open(path, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)


def test_fetch_rainfall_anomaly_computes_difference_from_baseline(tmp_path: Path):
    client = CHIRPSClient(base_url="https://example.com/chirps", cache_dir=tmp_path)
    ward_geometry = box(6.02, 6.92, 6.06, 6.96)

    current_period = date(2024, 6, 1)
    baseline_period = date(2023, 6, 1)

    _write_synthetic_gzip_raster(tmp_path / client.raster_filename(current_period), fill_value=200.0)
    _write_synthetic_gzip_raster(tmp_path / client.raster_filename(baseline_period), fill_value=100.0)

    observation = client.fetch_rainfall_anomaly(
        ward_external_code="ward-001",
        ward_geometry=ward_geometry,
        current_period=current_period,
        baseline_periods=[baseline_period],
    )

    assert observation.metric_name == "rainfall_anomaly_mm"
    assert observation.metric_value == 100.0
