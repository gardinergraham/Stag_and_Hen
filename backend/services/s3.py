import os
import uuid
import boto3
from urllib.parse import urlparse

AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
AWS_BUCKET_NAME = os.environ["AWS_BUCKET_NAME"]
AWS_REGION = os.environ.get("AWS_REGION", "eu-west-2")

s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)


def upload_bytes_to_s3(file_bytes: bytes, filename: str, content_type: str) -> str:
    extension = filename.split(".")[-1] if "." in filename else "jpg"
    key = f"media/{uuid.uuid4()}.{extension}"

    s3_client.put_object(
        Bucket=AWS_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )

    return f"https://{AWS_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"


def delete_s3_file_by_url(file_url: str) -> bool:
    try:
        parsed = urlparse(file_url)
        key = parsed.path.lstrip("/")
        if not key:
            return False

        s3_client.delete_object(Bucket=AWS_BUCKET_NAME, Key=key)
        return True
    except Exception:
        return False