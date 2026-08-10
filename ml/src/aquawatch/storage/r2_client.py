import boto3


class R2UploadError(RuntimeError):
    pass


def build_r2_client(account_id: str, access_key_id: str, secret_access_key: str):
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",
    )


def upload_bytes(
    s3_client,
    bucket_name: str,
    key: str,
    data: bytes,
    content_type: str,
    public_url_base: str,
) -> str:
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    except Exception as error:
        raise R2UploadError(f"failed to upload {key} to R2: {error}") from error

    return f"{public_url_base.rstrip('/')}/{key}"
