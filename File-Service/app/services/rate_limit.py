from fastapi import HTTPException, status, Request
from app.core.valkey import r

RATE_LIMIT = 5
WINDOW_SECONDS = 60
KEY_PREFIX = "rl"

async def verify_rate_limit(request: Request):
    client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    rl_key = f"{KEY_PREFIX}:{client_ip}"
    with r.pipeline(transaction=True) as pipe:
        pipe.incr(rl_key)
        pipe.expire(rl_key, WINDOW_SECONDS, nx=True)  # 'nx=True' sets expiry only on creation
        current_hits, _ = pipe.execute()
    
    # 3. Check if the rate limit is exceeded
    if current_hits > RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    return client_ip