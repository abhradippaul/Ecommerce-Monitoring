from fastapi import HTTPException
from botocore.exceptions import ClientError
from app.core.aws import get_s3_client
from app.core.config import settings

s3_client = get_s3_client()


def delete_file(key: str) -> None:
    try:
        s3_client.delete_object(Bucket=settings.s3_bucket_name, Key=key)
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {e}")


def generate_presigned_preview_url(key: str, expires_in: int = 3600) -> str:
    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"URL generation failed: {e}")


def generate_upload_presigned_url(
    key: str, content_type: str, expires_in: int = 3600
) -> str:
    try:
        return s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.s3_bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"URL generation failed: {e}")


def ensure_bucket_cors() -> None:
    try:
        cors_config = {
            "CORSRules": [
                {
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                    "AllowedOrigins": ["*"],
                    "ExposeHeaders": ["ETag"],
                    "MaxAgeSeconds": 3000,
                }
            ]
        }
        s3_client.put_bucket_cors(
            Bucket=settings.s3_bucket_name, CORSConfiguration=cors_config
        )
    except Exception as e:
        print(f"Warning: Could not configure S3 bucket CORS: {e}")

