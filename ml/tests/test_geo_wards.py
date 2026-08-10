import json
from pathlib import Path

import pytest

from aquawatch.geo.wards import WardBoundaryValidationError, load_ward_boundaries, ward_centroid_lonlat


def _write_geojson(path: Path, features: list[dict]) -> Path:
    payload = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    path.write_text(json.dumps(payload))
    return path


def _sample_feature(state: str, lga_name: str, ward_name: str) -> dict:
    return {
        "type": "Feature",
        "properties": {"state": state, "lga_name": lga_name, "ward_name": ward_name},
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[6.0, 7.0], [6.1, 7.0], [6.1, 7.1], [6.0, 7.1], [6.0, 7.0]]],
        },
    }


def test_load_ward_boundaries_filters_by_target_states(tmp_path: Path):
    geojson_path = _write_geojson(
        tmp_path / "wards.geojson",
        [
            _sample_feature("Kogi", "Lokoja", "Adankolo"),
            _sample_feature("Lagos", "Ikeja", "Alausa"),
        ],
    )

    gdf = load_ward_boundaries(geojson_path, target_states=["Kogi"])

    assert len(gdf) == 1
    assert gdf.iloc[0]["state"] == "Kogi"


def test_load_ward_boundaries_raises_on_missing_columns(tmp_path: Path):
    geojson_path = _write_geojson(
        tmp_path / "wards.geojson",
        [{"type": "Feature", "properties": {}, "geometry": {
            "type": "Polygon",
            "coordinates": [[[6.0, 7.0], [6.1, 7.0], [6.1, 7.1], [6.0, 7.1], [6.0, 7.0]]],
        }}],
    )

    with pytest.raises(WardBoundaryValidationError):
        load_ward_boundaries(geojson_path)


def test_ward_centroid_lonlat_returns_point_within_bounds(tmp_path: Path):
    geojson_path = _write_geojson(tmp_path / "wards.geojson", [_sample_feature("Kogi", "Lokoja", "Adankolo")])
    gdf = load_ward_boundaries(geojson_path)

    lon, lat = ward_centroid_lonlat(gdf.iloc[0].geometry)

    assert 6.0 <= lon <= 6.1
    assert 7.0 <= lat <= 7.1
