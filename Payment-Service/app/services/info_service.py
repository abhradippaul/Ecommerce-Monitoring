from typing import Dict, Any
from app.core.config import settings


class InfoService:
    def get_info(self) -> Dict[str, Any]:
        return {
            "name": settings.app_name,
            "version": "1.0.0",
            "description": "Payment Processing Service for NodeJS Monitoring Application",
            "environment": settings.node_env,
        }


info_service = InfoService()
