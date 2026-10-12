from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.info import router as info_router
from app.api.v1.payments import router as payments_router

api_router = APIRouter()
api_router.include_router(health_router, prefix="/health")
api_router.include_router(info_router, prefix="/info")
api_router.include_router(payments_router, prefix="/payments")
