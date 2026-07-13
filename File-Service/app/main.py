import time
from datetime import datetime, timezone
from fastapi import FastAPI
from app.api.v1.router import api_router

start_time = time.time()

app = FastAPI(
    title="File Service",
    description="Microservice for managing file uploads, previews, and deletions using AWS S3.",
    version="1.0.0",
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
