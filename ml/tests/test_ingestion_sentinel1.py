import pytest
from shapely.geometry import Polygon

from aquawatch.ingestion.sentinel1 import SentinelHubClientError, SentinelHubWaterFractionClient


def test_client_requires_credentials():
    with pytest.raises(SentinelHubClientError):
        SentinelHubWaterFractionClient(client_id="", client_secret="")


def test_extract_mean_water_fraction_parses_valid_response():
    response = [
        {
            "data": [
                {
                    "interval": {"from": "2021-09-01T00:00:00Z", "to": "2021-09-30T00:00:00Z"},
                    "outputs": {
                        "water_fraction": {
                            "bands": {"B0": {"stats": {"mean": 0.42, "min": 0.0, "max": 1.0}}}
                        }
                    },
                }
            ],
            "status": "OK",
        }
    ]

    result = SentinelHubWaterFractionClient._extract_mean_water_fraction(response)

    assert result == pytest.approx(0.42)


def test_extract_mean_water_fraction_raises_on_empty_response():
    with pytest.raises(SentinelHubClientError):
        SentinelHubWaterFractionClient._extract_mean_water_fraction([])


def test_extract_mean_water_fraction_raises_when_data_list_is_empty():
    response = [{"data": [], "status": "OK", "geometryPixelCount": None}]

    with pytest.raises(SentinelHubClientError):
        SentinelHubWaterFractionClient._extract_mean_water_fraction(response)


def test_extract_mean_water_fraction_raises_on_unexpected_shape():
    response = [{"data": [{"outputs": {}}], "status": "OK"}]

    with pytest.raises(SentinelHubClientError):
        SentinelHubWaterFractionClient._extract_mean_water_fraction(response)


def test_build_request_uses_ward_geometry_bounds():
    client = SentinelHubWaterFractionClient(client_id="id", client_secret="secret")
    ward_geometry = Polygon([(6.0, 7.0), (6.1, 7.0), (6.1, 7.1), (6.0, 7.1)])

    from datetime import date

    request = client.build_request(ward_geometry, date(2024, 1, 1), date(2024, 1, 31))

    assert request is not None
