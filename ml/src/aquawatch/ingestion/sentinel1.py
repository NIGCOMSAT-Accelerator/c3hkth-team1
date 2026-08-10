import json
from datetime import date

from sentinelhub import (
    CRS,
    DataCollection,
    Geometry,
    SentinelHubStatistical,
    SHConfig,
)

from aquawatch.ingestion.base import WardObservation

WATER_BACKSCATTER_THRESHOLD_DB = -17.0

STATISTICAL_RESOLUTION_DEGREES = 0.0009

EVALSCRIPT_VV_WATER_FRACTION = f"""
//VERSION=3
function setup() {{
  return {{
    input: [{{ bands: ["VV", "dataMask"] }}],
    output: [
      {{ id: "water_fraction", bands: 1 }},
      {{ id: "dataMask", bands: 1 }}
    ]
  }};
}}

function evaluatePixel(sample) {{
  let vv_db = 10 * Math.log(sample.VV) / Math.LN10;
  let is_water = vv_db < {WATER_BACKSCATTER_THRESHOLD_DB} ? 1 : 0;
  return {{
    water_fraction: [is_water],
    dataMask: [sample.dataMask]
  }};
}}
"""


class SentinelHubClientError(RuntimeError):
    pass


class SentinelHubWaterFractionClient:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        instance_id: str = "",
        base_url: str = "https://sh.dataspace.copernicus.eu",
        token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    ):
        if not client_id or not client_secret:
            raise SentinelHubClientError("Sentinel Hub client_id and client_secret are required")

        config = SHConfig()
        config.sh_client_id = client_id
        config.sh_client_secret = client_secret
        config.sh_base_url = base_url
        config.sh_token_url = token_url
        if instance_id:
            config.instance_id = instance_id
        self._config = config

    def build_request(
        self, ward_geometry, start: date, end: date
    ) -> SentinelHubStatistical:
        geometry = Geometry(ward_geometry, crs=CRS.WGS84)

        cdse_sentinel1_iw = DataCollection.SENTINEL1_IW.define_from(
            "SENTINEL1_IW_CDSE", service_url=self._config.sh_base_url
        )

        span_days = max((end - start).days, 1)

        return SentinelHubStatistical(
            aggregation=SentinelHubStatistical.aggregation(
                evalscript=EVALSCRIPT_VV_WATER_FRACTION,
                time_interval=(start.isoformat(), end.isoformat()),
                aggregation_interval=f"P{span_days}D",
                resolution=(STATISTICAL_RESOLUTION_DEGREES, STATISTICAL_RESOLUTION_DEGREES),
            ),
            input_data=[
                SentinelHubStatistical.input_data(cdse_sentinel1_iw)
            ],
            geometry=geometry,
            config=self._config,
        )

    def fetch_water_fraction(
        self, ward_external_code: str, ward_geometry, start: date, end: date
    ) -> WardObservation:
        request = self.build_request(ward_geometry, start, end)
        response = request.get_data()
        water_fraction = self._extract_mean_water_fraction(response)

        return WardObservation(
            ward_external_code=ward_external_code,
            source="sentinel1",
            observed_on=end,
            metric_name="water_fraction",
            metric_value=water_fraction,
            raw_payload={"time_interval": [start.isoformat(), end.isoformat()]},
        )

    @staticmethod
    def _extract_mean_water_fraction(response: list[dict]) -> float:
        if not response:
            raise SentinelHubClientError("empty response from Sentinel Hub Statistical API")

        wrapper = response[0]
        data_intervals = wrapper.get("data", [])

        if not data_intervals:
            raise SentinelHubClientError(
                f"no data intervals in Sentinel Hub response: {json.dumps(wrapper)[:200]}"
            )

        interval = data_intervals[0]
        stats = interval.get("outputs", {}).get("water_fraction", {}).get("bands", {}).get("B0", {}).get("stats")

        if stats is None:
            raise SentinelHubClientError(
                f"unexpected Sentinel Hub response shape: {json.dumps(interval)[:200]}"
            )

        return float(stats["mean"])
