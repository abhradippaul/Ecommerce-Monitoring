import time
from datetime import datetime, timezone
from typing import Dict, Any

_start_time = time.time()


class HealthService:
    def get_health_status(self) -> Dict[str, Any]:
        return {
            "status": "UP",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime": time.time() - _start_time,
        }


health_service = HealthService()
