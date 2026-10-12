from fastapi import APIRouter, Request
from app.services.info_service import info_service
from app.core.logger import logger
from app.telemetry.traces import with_http_span

router = APIRouter(tags=["Info"])


@router.get("", include_in_schema=True)
@router.get("/")
async def get_info(request: Request):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("Info requested", trace_id=trace_id)
        info_data = info_service.get_info()
        return {
            "message": "Successfully fetched application info",
            "data": info_data,
        }

    return await with_http_span("getInfo", request.method, str(request.url.path), _handle)
