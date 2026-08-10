import argparse
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

from sqlalchemy import text

from aquawatch.config import get_settings
from aquawatch.db import build_engine
from aquawatch.ingestion.sentinel1_image import SentinelHubImageClient, SentinelHubImageClientError
from aquawatch.seed_environmental_data import CURRENT_PERIOD, CURRENT_PERIOD_END, load_wards_with_geometry
from aquawatch.storage.r2_client import R2UploadError, build_r2_client, upload_bytes

print_lock = threading.Lock()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate satellite water-highlight images per ward.")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only process the first N wards that don't already have an image. Useful for a quick demo-prep run.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-generate images even for wards that already have one.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=5,
        help="Number of wards to process in parallel. Default 5. Use 1 for the old sequential behavior.",
    )
    return parser.parse_args()


def load_wards_with_existing_image(database_url: str) -> set[str]:
    engine = build_engine(database_url)
    with engine.connect() as connection:
        result = connection.execute(text("select id from wards where satellite_image_url is not null"))
        return {str(row[0]) for row in result}


def process_ward(
    row,
    position: int,
    total: int,
    image_client: SentinelHubImageClient,
    s3_client,
    engine,
    bucket_name: str,
    public_url_base: str,
) -> bool:
    ward_id = row["ward_id"]
    external_code = row["external_code"]
    geometry = row["geometry"]

    ward_start = time.monotonic()
    try:
        png_bytes = image_client.fetch_water_highlight_png(geometry, CURRENT_PERIOD, CURRENT_PERIOD_END)
        key = f"ward-images/{external_code}.png"
        url = upload_bytes(s3_client, bucket_name, key, png_bytes, "image/png", public_url_base)

        # Each ward commits independently, so interrupting the run never loses prior progress.
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    update wards
                    set satellite_image_url = :url, satellite_image_updated_at = :updated_at
                    where id = :ward_id
                    """
                ),
                {"url": url, "updated_at": date.today(), "ward_id": ward_id},
            )

        elapsed = time.monotonic() - ward_start
        with print_lock:
            print(f"[{position}/{total}] {external_code}: done in {elapsed:.1f}s")
        return True
    except (SentinelHubImageClientError, R2UploadError) as error:
        elapsed = time.monotonic() - ward_start
        with print_lock:
            print(f"[{position}/{total}] {external_code}: FAILED after {elapsed:.1f}s — {error}")
        return False


def main() -> None:
    args = parse_args()
    settings = get_settings()

    if not settings.sentinelhub_client_id or not settings.sentinelhub_client_secret:
        print("Sentinel Hub credentials not set — cannot generate satellite images. Exiting.")
        return

    if not settings.r2_account_id or not settings.r2_public_url_base:
        print("Cloudflare R2 credentials not set — cannot upload images. Exiting.")
        return

    wards = load_wards_with_geometry(settings.database_url)
    engine = build_engine(settings.database_url)

    already_done = set() if args.force else load_wards_with_existing_image(settings.database_url)
    pending = wards[~wards["ward_id"].astype(str).isin(already_done)]

    if args.limit is not None:
        pending = pending.head(args.limit)

    total = len(pending)
    skipped = len(wards) - len(wards[~wards["ward_id"].astype(str).isin(already_done)])

    print(f"{total} wards to process with {args.workers} parallel workers ({skipped} already have an image)")
    if total == 0:
        print("Nothing to do.")
        return

    image_client = SentinelHubImageClient(
        client_id=settings.sentinelhub_client_id,
        client_secret=settings.sentinelhub_client_secret,
        base_url=settings.sentinelhub_base_url,
        token_url=settings.sentinelhub_token_url,
    )
    s3_client = build_r2_client(
        settings.r2_account_id, settings.r2_access_key_id, settings.r2_secret_access_key
    )

    generated = 0
    failed = 0
    run_start = time.monotonic()

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [
            executor.submit(
                process_ward,
                row,
                position,
                total,
                image_client,
                s3_client,
                engine,
                settings.r2_bucket_name,
                settings.r2_public_url_base,
            )
            for position, (_, row) in enumerate(pending.iterrows(), start=1)
        ]

        for future in as_completed(futures):
            if future.result():
                generated += 1
            else:
                failed += 1

    total_elapsed = time.monotonic() - run_start
    print(f"\ndone in {total_elapsed / 60:.1f} min — generated: {generated}, failed: {failed}")


if __name__ == "__main__":
    main()
