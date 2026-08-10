from unittest.mock import MagicMock

import pytest

from aquawatch.storage.r2_client import R2UploadError, upload_bytes


def test_upload_bytes_calls_put_object_with_expected_args():
    s3_client = MagicMock()

    url = upload_bytes(
        s3_client,
        bucket_name="aquawatch-images",
        key="ward-images/KOGI-LOKOJA.png",
        data=b"fake-png-bytes",
        content_type="image/png",
        public_url_base="https://pub-abc123.r2.dev",
    )

    s3_client.put_object.assert_called_once_with(
        Bucket="aquawatch-images",
        Key="ward-images/KOGI-LOKOJA.png",
        Body=b"fake-png-bytes",
        ContentType="image/png",
    )
    assert url == "https://pub-abc123.r2.dev/ward-images/KOGI-LOKOJA.png"


def test_upload_bytes_strips_trailing_slash_from_base_url():
    s3_client = MagicMock()

    url = upload_bytes(
        s3_client,
        bucket_name="aquawatch-images",
        key="ward-images/foo.png",
        data=b"data",
        content_type="image/png",
        public_url_base="https://pub-abc123.r2.dev/",
    )

    assert url == "https://pub-abc123.r2.dev/ward-images/foo.png"


def test_upload_bytes_raises_r2_upload_error_on_failure():
    s3_client = MagicMock()
    s3_client.put_object.side_effect = Exception("connection reset")

    with pytest.raises(R2UploadError):
        upload_bytes(
            s3_client,
            bucket_name="aquawatch-images",
            key="ward-images/foo.png",
            data=b"data",
            content_type="image/png",
            public_url_base="https://pub-abc123.r2.dev",
        )
