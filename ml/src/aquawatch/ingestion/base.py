from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True, slots=True)
class WardObservation:
    ward_external_code: str
    source: str
    observed_on: date
    metric_name: str
    metric_value: float
    raw_payload: dict | None = None
