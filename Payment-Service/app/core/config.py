import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Server
    port: int = Field(default=3005, validation_alias="PORT")
    node_env: str = Field(default="dev", validation_alias="NODE_ENV")
    app_name: str = Field(default="payment-service", validation_alias="APP_NAME")
    service_name: str = Field(default="payment-service", validation_alias="SERVICE_NAME")
    service_version: str = Field(default="1.0.0", validation_alias="SERVICE_VERSION")

    # Database
    mongo_uri: str = Field(
        default="mongodb://localhost:27017/nodejs-monitoring",
        validation_alias="MONGODB_URI",
    )

    # Logging
    log_level: str = Field(default="info", validation_alias="LOG_LEVEL")
    log_to_file: bool = Field(default=True, validation_alias="LOG_TO_FILE")
    log_file: str = Field(default="logs/combined.log", validation_alias="LOG_FILE")
    error_file: str = Field(default="logs/error.log", validation_alias="ERROR_FILE")

    # Auth
    jwt_public_key_file_location: str = Field(
        default="./keys/public.pem",
        validation_alias="JWT_PUBLIC_KEY_FILE_LOCATION",
    )

    # OpenTelemetry
    otel_service_name: str = Field(default="payment-service", validation_alias="OTEL_SERVICE_NAME")
    otel_service_version: str = Field(default="1.0.0", validation_alias="OTEL_SERVICE_VERSION")
    otel_exporter_otlp_traces_endpoint: str = Field(
        default="http://localhost:4318/v1/traces",
        validation_alias="OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
    )
    otel_exporter_otlp_metrics_endpoint: str = Field(
        default="http://localhost:4318/v1/metrics",
        validation_alias="OTEL_EXPORTER_OTLP_METRICS_ENDPOINT",
    )
    otel_exporter_otlp_logs_endpoint: str = Field(
        default="http://localhost:4318/v1/logs",
        validation_alias="OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    )

    # gRPC
    grpc_port: int = Field(default=50055, validation_alias="GRPC_PORT")
    order_service_grpc_url: str = Field(
        default="localhost:50051",
        validation_alias="ORDER_SERVICE_GRPC_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def model_post_init(self, __context):
        # Allow SERVICE_NAME fallback to OTEL_SERVICE_NAME or vice-versa
        otel_name = os.getenv("OTEL_SERVICE_NAME")
        svc_name = os.getenv("SERVICE_NAME")
        if svc_name and not otel_name:
            self.otel_service_name = svc_name
        elif otel_name and not svc_name:
            self.service_name = otel_name


settings = Settings()
