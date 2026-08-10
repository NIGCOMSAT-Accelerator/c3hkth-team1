from pathlib import Path

import numpy as np
import rasterio
import responses
from rasterio.transform import from_origin
from shapely.geometry import box

from aquawatch.ingestion.worldpop import WorldPopClient, WorldPopClientError


def _write_synthetic_population_raster(path: Path, per_pixel_value: float) -> None:
    transform = from_origin(west=6.0, north=7.0, xsize=0.01, ysize=0.01)
    data = np.full((10, 10), per_pixel_value, dtype="float32")

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


def test_raster_filename_matches_worldpop_convention():
    client = WorldPopClient(base_url="https://example.com/worldpop", cache_dir=Path("/tmp"))
    assert client.raster_filename(2020) == "nga_ppp_2020_1km_Aggregated.tif"


@responses.activate
def test_download_population_raster_caches_to_disk(tmp_path: Path):
    client = WorldPopClient(base_url="https://example.com/worldpop", cache_dir=tmp_path)
    filename = client.raster_filename(2020)

    responses.add(
        responses.GET,
        f"https://example.com/worldpop/2020/NGA/{filename}",
        body=b"fake-population-raster",
        status=200,
    )

    destination = client.download_population_raster(2020)

    assert destination.exists()
    assert destination.read_bytes() == b"fake-population-raster"


def test_fetch_population_density_computes_expected_density(tmp_path: Path):
    client = WorldPopClient(base_url="https://example.com/worldpop", cache_dir=tmp_path)
    raster_path = tmp_path / client.raster_filename(2020)
    _write_synthetic_population_raster(raster_path, per_pixel_value=10.0)

    ward_geometry = box(6.02, 6.92, 6.06, 6.96)

    observation = client.fetch_population_density(
        ward_external_code="ward-001",
        ward_geometry=ward_geometry,
        ward_area_sq_km=5.0,
        year=2020,
    )

    assert observation.metric_name == "population_density"
    assert observation.metric_value > 0
