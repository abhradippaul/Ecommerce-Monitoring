import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes
from app.core.config import settings
from app.core.logger import logger


_is_instrumented = False


def setup_telemetry():
    global _is_instrumented
    if _is_instrumented:
        return

    if settings.node_env == "test" or os.getenv("OTEL_SDK_DISABLED") == "true":
        _is_instrumented = True
        return

    resource = Resource.create(
        {
            ResourceAttributes.SERVICE_NAME: settings.service_name,
            ResourceAttributes.SERVICE_VERSION: settings.service_version,
        }
    )

    # 1. Traces Setup
    try:
        tracer_provider = TracerProvider(resource=resource)
        span_exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_traces_endpoint)
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
        trace.set_tracer_provider(tracer_provider)
    except Exception as e:
        logger.warn(f"Failed to initialize OTLP Traces exporter: {e}")

    # 2. Metrics Setup
    try:
        metric_reader = PeriodicExportingMetricReader(
            OTLPMetricExporter(endpoint=settings.otel_exporter_otlp_metrics_endpoint),
            export_interval_millis=1000,
        )
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)
    except Exception as e:
        logger.warn(f"Failed to initialize OTLP Metrics exporter: {e}")

    _is_instrumented = True
    logger.info("OpenTelemetry instrumentation initialized successfully")
