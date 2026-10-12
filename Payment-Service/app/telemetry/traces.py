import inspect
from typing import Any, Callable, TypeVar, Coroutine
from opentelemetry import trace
from opentelemetry.trace import Span, StatusCode
from opentelemetry.semconv.trace import SpanAttributes
from app.core.config import settings
from app.core.error import HttpError

tracer = trace.get_tracer(settings.service_name, settings.service_version)

T = TypeVar("T")


def handle_span_error(span: Span, err: Exception):
    span.set_attribute("error.type", type(err).__name__)

    if isinstance(err, HttpError) and err.status_code < 500:
        span.set_status(StatusCode.OK)
    else:
        span.record_exception(err)
        span.set_status(StatusCode.ERROR, description=str(err))


async def with_span(name: str, fn: Callable[[Span], Any]) -> Any:
    with tracer.start_as_current_span(name) as span:
        try:
            if inspect.iscoroutinefunction(fn):
                result = await fn(span)
            else:
                result = fn(span)
                if inspect.isawaitable(result):
                    result = await result
            span.set_status(StatusCode.OK)
            return result
        except Exception as err:
            handle_span_error(span, err)
            raise


async def with_http_span(
    name: str,
    method: str,
    path: str,
    fn: Callable[[Span], Any],
) -> Any:
    with tracer.start_as_current_span(name) as span:
        if method:
            span.set_attribute(SpanAttributes.HTTP_METHOD, method)
        if path:
            span.set_attribute(SpanAttributes.HTTP_TARGET, path)

        try:
            if inspect.iscoroutinefunction(fn):
                result = await fn(span)
            else:
                result = fn(span)
                if inspect.isawaitable(result):
                    result = await result

            span.set_status(StatusCode.OK)
            return result
        except Exception as err:
            handle_span_error(span, err)
            raise
