import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.core.config import settings
from app.core.logger import logger
from app.core.db import connect_db, close_db
from app.api.v1.router import api_router
from app.api.v1.health import router as health_router
from app.api.v1.info import router as info_router
from app.api.v1.payments import router as payments_router
from app.grpc_server.server import start_grpc_server
from app.telemetry.instrumentation import setup_telemetry
from app.telemetry.metrics import HttpMetricsMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Setup OpenTelemetry
    setup_telemetry()

    # 2. Connect Database
    await connect_db()

    # 3. Start gRPC server
    grpc_server = start_grpc_server(port=settings.grpc_port)

    logger.info(
        f"Payment Service is running in {settings.node_env} environment on http://localhost:{settings.port}"
    )

    yield

    # Graceful shutdown
    grpc_server.stop(grace=5)
    await close_db()


app = FastAPI(
    title=settings.app_name,
    description="Payment Processing Service for Ecommerce Monitoring Application",
    version=settings.service_version,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Configuration matching Express app.ts
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "x-requested-with",
        "x-user-id",
    ],
)

# ---------------------------------------------------------------------------
# HTTP Metrics Middleware
# ---------------------------------------------------------------------------
app.add_middleware(HttpMetricsMiddleware)


# ---------------------------------------------------------------------------
# Logger Middleware matching logger.middleware.ts
# ---------------------------------------------------------------------------
@app.middleware("http")
async def request_logger_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000)
    url_path = request.url.path
    message = f"{request.method} {url_path}"
    status_code = response.status_code

    meta = {
        "method": request.method,
        "url": url_path,
        "statusCode": status_code,
        "duration": f"{duration_ms}ms",
    }

    if status_code >= 500:
        logger.error(message, **meta)
    elif status_code >= 400:
        logger.warn(message, **meta)
    else:
        logger.info(message, **meta)

    return response


# ---------------------------------------------------------------------------
# Error Handling Middleware matching app.ts
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error"},
    )


# ---------------------------------------------------------------------------
# Routes Registration
# Express mounts:
# app.use('/health', healthRoutes);
# app.use('/info', infoRoutes);
# app.use('/payments', paymentRoutes);
# app.use('/api/v1/payments', paymentRoutes);
# ---------------------------------------------------------------------------
app.include_router(health_router, prefix="/health")
app.include_router(info_router, prefix="/info")
app.include_router(payments_router, prefix="/payments")
app.include_router(payments_router, prefix="/api/v1/payments")
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {
        "message": "Payment Service is running",
        "service": settings.service_name,
        "environment": settings.node_env,
    }


# Auto-instrument FastAPI routes with OpenTelemetry
try:
    FastAPIInstrumentor.instrument_app(app)
except Exception:
    pass
