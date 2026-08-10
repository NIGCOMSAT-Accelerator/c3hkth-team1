import sys
from datetime import date
from pathlib import Path

from sentinelhub import CRS, BBox, DataCollection, SentinelHubCatalog, SHConfig

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from aquawatch.config import get_settings


def main() -> None:
    settings = get_settings()

    config = SHConfig()
    config.sh_client_id = settings.sentinelhub_client_id
    config.sh_client_secret = settings.sentinelhub_client_secret
    config.sh_base_url = settings.sentinelhub_base_url
    config.sh_token_url = settings.sentinelhub_token_url

    catalog = SentinelHubCatalog(config=config)

    nigeria_bbox = BBox(bbox=(3.0, 6.0, 9.0, 12.0), crs=CRS.WGS84)

    collection = DataCollection.SENTINEL1_IW.define_from(
        "SENTINEL1_IW_CDSE_DIAG", service_url=config.sh_base_url
    )

    search_iterator = catalog.search(
        collection,
        bbox=nigeria_bbox,
        time=(date(2021, 9, 1), date(2021, 9, 30)),
        limit=5,
    )

    results = list(search_iterator)
    print(f"found {len(results)} Sentinel-1 scenes over a broad Nigeria bbox in Sept 2021")
    for item in results[:5]:
        print(" -", item.get("id"), item.get("properties", {}).get("datetime"))

    if not results:
        print("")
        print("ZERO results even over a huge bbox and a full month.")
        print("This means the collection id or catalog access itself is the problem,")
        print("not any individual ward's geometry or the Statistical API request shape.")


if __name__ == "__main__":
    main()
