from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # AWS
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    s3_bucket_name: str

    # S3 folders
    s3_avatar_images_folder: str = "avatar/images"
    s3_product_images_folder: str = "product/images"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
