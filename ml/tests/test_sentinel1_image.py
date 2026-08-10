from datetime import date

import numpy as np
import pytest
from shapely.geometry import Polygon

from aquawatch.ingestion.sentinel1_image import (
    SentinelHubImageClient,
    SentinelHubImageClientError,
    encode_png,
)


def test_client_requires_credentials():
    with pytest.raises(SentinelHubImageClientError):
        SentinelHubImageClient(client_id="", client_secret="")


def test_build_request_uses_requested_size():
    client = SentinelHubImageClient(client_id="id", client_secret="secret")
    ward_geometry = Polygon([(6.0, 7.0), (6.1, 7.0), (6.1, 7.1), (6.0, 7.1)])

    request = client.build_request(ward_geometry, date(2021, 9, 1), date(2021, 9, 30), (256, 256))

    assert request.payload["output"]["width"] == 256
    assert request.payload["output"]["height"] == 256


def test_build_request_uses_png_response_format():
    client = SentinelHubImageClient(client_id="id", client_secret="secret")
    ward_geometry = Polygon([(6.0, 7.0), (6.1, 7.0), (6.1, 7.1), (6.0, 7.1)])

    request = client.build_request(ward_geometry, date(2021, 9, 1), date(2021, 9, 30), (512, 512))

    assert request.payload["output"]["responses"][0]["format"]["type"] == "image/png"


def test_encode_png_produces_valid_png_bytes():
    array = (np.random.default_rng(1).random((32, 32, 3)) * 255).astype("uint8")

    png_bytes = encode_png(array)

    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"


def test_fetch_water_highlight_png_raises_on_empty_response(monkeypatch):
    client = SentinelHubImageClient(client_id="id", client_secret="secret")
    ward_geometry = Polygon([(6.0, 7.0), (6.1, 7.0), (6.1, 7.1), (6.0, 7.1)])

    class FakeRequest:
        def get_data(self):
            return []

    monkeypatch.setattr(client, "build_request", lambda *args, **kwargs: FakeRequest())

    with pytest.raises(SentinelHubImageClientError):
        client.fetch_water_highlight_png(ward_geometry, date(2021, 9, 1), date(2021, 9, 30))


def test_fetch_water_highlight_png_encodes_returned_array(monkeypatch):
    client = SentinelHubImageClient(client_id="id", client_secret="secret")
    ward_geometry = Polygon([(6.0, 7.0), (6.1, 7.0), (6.1, 7.1), (6.0, 7.1)])
    array = (np.random.default_rng(2).random((16, 16, 3)) * 255).astype("uint8")

    class FakeRequest:
        def get_data(self):
            return [array]

    monkeypatch.setattr(client, "build_request", lambda *args, **kwargs: FakeRequest())

    png_bytes = client.fetch_water_highlight_png(ward_geometry, date(2021, 9, 1), date(2021, 9, 30))

    assert png_bytes[:8] == b"\x89PNG\r\n\x1a\n"
