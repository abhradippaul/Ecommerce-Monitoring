from fastapi import APIRouter, Request, Depends, status
from fastapi.responses import JSONResponse
from app.core.security import authenticate_token
from app.schemas.auth import AuthUser
from app.core.logger import logger
from app.telemetry.traces import with_http_span
from app.telemetry.metrics import record_payment_operation

router = APIRouter(tags=["Payments"])


@router.get("", include_in_schema=True)
@router.get("/")
async def list_payments(
    request: Request,
    current_user: AuthUser = Depends(authenticate_token),
):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("List payments requested", trace_id=trace_id)
        # TODO: implement list payments logic
        record_payment_operation("list_payments", "success")
        return {
            "message": "Successfully fetched payments",
            "data": [],
        }

    return await with_http_span("listPayments", request.method, str(request.url.path), _handle)


@router.post("", status_code=status.HTTP_201_CREATED, include_in_schema=True)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_payment(
    request: Request,
    current_user: AuthUser = Depends(authenticate_token),
):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("Create payment requested", trace_id=trace_id)
        # TODO: implement payment creation logic
        record_payment_operation("create_payment", "success")
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Payment created successfully",
                "data": None,
            },
        )

    return await with_http_span("createPayment", request.method, str(request.url.path), _handle)


@router.get("/{id}")
async def get_payment(
    id: str,
    request: Request,
    current_user: AuthUser = Depends(authenticate_token),
):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("Get payment requested", trace_id=trace_id, paymentId=id)
        # TODO: implement get payment logic
        record_payment_operation("get_payment", "success")
        return {
            "message": "Successfully fetched payment",
            "data": None,
        }

    return await with_http_span("getPayment", request.method, str(request.url.path), _handle)


@router.post("/{id}/refund")
async def refund_payment(
    id: str,
    request: Request,
    current_user: AuthUser = Depends(authenticate_token),
):
    async def _handle(span):
        trace_id = format(span.get_span_context().trace_id, "032x")
        logger.info("Refund payment requested", trace_id=trace_id, paymentId=id)
        # TODO: implement refund logic
        record_payment_operation("refund_payment", "success")
        return {
            "message": "Payment refunded successfully",
            "data": None,
        }

    return await with_http_span("refundPayment", request.method, str(request.url.path), _handle)
