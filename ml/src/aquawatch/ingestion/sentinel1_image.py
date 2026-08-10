import io
from datetime import date

from PIL import Image
from sentinelhub import CRS, BBox, DataCollection, MimeType, SentinelHubRequest, SHConfig

WATER_HIGHLIGHT_EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: ["VV", "dataMask"],
    output: { bands: 3, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  let vv_db = 10 * Math.log(sample.VV) / Math.LN10;
  let is_water = vv_db < -17.0;

  if (is_water) {
    return [0.05, 0.35, 0.65];
  }

  let normalized = Math.min(1, Math.max(0, (vv_db + 25) / 15));
  return [normalized, normalized, normalized];
}
"""


class SentinelHubImageClientError(RuntimeError):
    pass


class SentinelHubImageClient:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        base_url: str = "https://sh.dataspace.copernicus.eu",
        token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    ):
        if not client_id or not client_secret:
            raise SentinelHubImageClientError("Sentinel Hub client_id and client_secret are required")

        config = SHConfig()
        config.sh_client_id = client_id
        config.sh_client_secret = client_secret
        config.sh_base_url = base_url
        config.sh_token_url = token_url
        self._config = config

    def build_request(self, ward_geometry, start: date, end: date, size: tuple[int, int]) -> SentinelHubRequest:
        cdse_sentinel1_iw = DataCollection.SENTINEL1_IW.define_from(
            "SENTINEL1_IW_CDSE", service_url=self._config.sh_base_url
        )
        bbox = BBox(bbox=ward_geometry.bounds, crs=CRS.WGS84)

        return SentinelHubRequest(
            evalscript=WATER_HIGHLIGHT_EVALSCRIPT,
            input_data=[
                SentinelHubRequest.input_data(
                    data_collection=cdse_sentinel1_iw,
                    time_interval=(start.isoformat(), end.isoformat()),
                )
            ],
            responses=[SentinelHubRequest.output_response("default", MimeType.PNG)],
            bbox=bbox,
            size=size,
            config=self._config,
        )

    def fetch_water_highlight_png(
        self, ward_geometry, start: date, end: date, size: tuple[int, int] = (512, 512)
    ) -> bytes:
        request = self.build_request(ward_geometry, start, end, size)
        results = request.get_data()

        if not results:
            raise SentinelHubImageClientError("empty response from Sentinel Hub Process API")

        return encode_png(results[0])


def encode_png(array) -> bytes:
    image = Image.fromarray(array)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
