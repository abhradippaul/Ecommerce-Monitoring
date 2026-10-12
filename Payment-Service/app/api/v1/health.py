from fastapi import APIRouter, Request
from app.services.health_service import health_service
from app.core.logger import logger
from app.telemetry.traces import with_http_span

router = APIRouter(tags=["Health"])


@router.get("", include_in_schema=True)
@router.get("/")
async def get_health(request: Request):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("Health check requested", trace_id=trace_id)
        status_data = health_service.get_health_status()
        return {
            "message": "Successfully fetched health status",
            "data": status_data,
        }

    return await with_http_span("getHealth", request.method, str(request.url.path), _handle)
