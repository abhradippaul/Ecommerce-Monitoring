import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.services.s3_service import ensure_bucket_cors
from app.grpc_server.server import start_grpc_server
from app.core.config import settings

start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_bucket_cors()
    grpc_server = start_grpc_server(port=settings.grpc_port)
    yield
    grpc_server.stop(grace=5)


app = FastAPI(
    title="File Service",
    description="Microservice for managing file uploads, previews, and deletions using AWS S3.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    """Health check endpoint showing service status and uptime."""
    uptime = time.time() - start_time
    return {
        "message": "File Service is running",
        "data": {
            "status": "UP",
            "timestamp": datetime.now(timezone.utc)
            .isoformat(timespec="milliseconds")
            .replace("+00:00", "Z"),
            "uptime": uptime,
        },
    }
