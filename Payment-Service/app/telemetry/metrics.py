import re
import time
import psutil
from typing import Callable, Literal
from opentelemetry import metrics
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.config import settings

# ---------------------------------------------------------------------------
# Meter Initialization
# ---------------------------------------------------------------------------
meter = metrics.get_meter(settings.service_name, settings.service_version)

# ---------------------------------------------------------------------------
# HTTP Layer & Golden Signals (RED Method)
# ---------------------------------------------------------------------------
request_counter = meter.create_counter(
    name="http.requests.total",
    description="Total HTTP requests partitioned by route, method, and status",
    unit="1",
)

latency_histogram = meter.create_histogram(
    name="http.client.request.duration",
    description="HTTP request duration in milliseconds",
    unit="ms",
)

active_requests_counter = meter.create_up_down_counter(
    name="http.requests.active",
    description="Current number of active in-flight HTTP requests",
    unit="1",
)

# ---------------------------------------------------------------------------
# Payment Domain Metrics
# ---------------------------------------------------------------------------
payment_operations_counter = meter.create_counter(
    name="payment.operations.total",
    description="Total payment operations partitioned by action and status",
    unit="1",
)

validation_error_counter = meter.create_counter(
    name="validation.errors.total",
    description="Total input and schema validation errors",
    unit="1",
)

# ---------------------------------------------------------------------------
# Downstream Dependency Health
# ---------------------------------------------------------------------------
dependency_duration_histogram = meter.create_histogram(
    name="payment.dependency.duration",
    description="Duration of downstream dependency operations in milliseconds",
    unit="ms",
)

dependency_errors_counter = meter.create_counter(
    name="payment.dependency.errors.total",
    description="Total downstream dependency failures",
    unit="1",
)

# ---------------------------------------------------------------------------
# Process & Memory Observability
# ---------------------------------------------------------------------------
def _observe_rss(options):
    try:
        mem = psutil.Process().memory_info().rss
        return [metrics.Observation(mem)]
    except Exception:
        return [metrics.Observation(0)]


rss_gauge = meter.create_observable_gauge(
    name="process.memory.rss",
    description="Process resident set size (RSS) in bytes",
    unit="By",
    callbacks=[_observe_rss],
)


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def record_payment_operation(
    action: Literal["create_payment", "get_payment", "list_payments", "update_payment", "refund_payment"],
    status: Literal["success", "failure"] = "success",
):
    payment_operations_counter.add(1, {"action": action, "status": status})


def record_validation_error(error_type: str, route: str = "unknown"):
    validation_error_counter.add(1, {"error_type": error_type, "route": route})


def record_dependency_duration(
    dependency: Literal["mongodb", "order_service"],
    operation: str,
    duration_ms: float,
    status: Literal["success", "error"] = "success",
):
    dependency_duration_histogram.record(
        duration_ms,
        {"dependency": dependency, "operation": operation, "status": status},
    )


def record_dependency_error(
    dependency: Literal["mongodb", "order_service"],
    operation: str,
):
    dependency_errors_counter.add(1, {"dependency": dependency, "operation": operation})


_id_regex = re.compile(r"/[0-9a-fA-F]{24}(?=/|$)")
_uuid_regex = re.compile(
    r"/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=/|$)"
)
_number_regex = re.compile(r"/\d+(?=/|$)")


def get_route_pattern(request: Request) -> str:
    # If route matched in FastAPI
    if request.scope.get("endpoint"):
        route = request.scope.get("route")
        if route and hasattr(route, "path"):
            return route.path

    raw_path = request.url.path or "/"
    pattern = _id_regex.sub("/:id", raw_path)
    pattern = _uuid_regex.sub("/:uuid", pattern)
    pattern = _number_regex.sub("/:id", pattern)
    return pattern


# ---------------------------------------------------------------------------
# HTTP Metrics Middleware
# ---------------------------------------------------------------------------
class HttpMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method

        active_requests_counter.add(1, {"http_method": method})
        active_decremented = False

        def decrement_active():
            nonlocal active_decremented
            if not active_decremented:
                active_decremented = True
                active_requests_counter.add(-1, {"http_method": method})

        try:
            response = await call_next(request)
            decrement_active()

            duration_ms = (time.perf_counter() - start_time) * 1000.0
            route = get_route_pattern(request)
            status_code = response.status_code
            status = "error" if status_code >= 400 else "success"

            request_counter.add(
                1,
                {
                    "route": route,
                    "http_method": method,
                    "status_code": str(status_code),
                    "status": status,
                },
            )

            latency_histogram.record(
                duration_ms,
                {
                    "route": route,
                    "http_method": method,
                    "status_code": str(status_code),
                    "status": status,
                },
            )

            return response
        except Exception:
            decrement_active()
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            route = get_route_pattern(request)
            status_code = 500

            request_counter.add(
                1,
                {
                    "route": route,
                    "http_method": method,
                    "status_code": str(status_code),
                    "status": "error",
                },
            )

            latency_histogram.record(
                duration_ms,
                {
                    "route": route,
                    "http_method": method,
                    "status_code": str(status_code),
                    "status": "error",
                },
            )
            raise
