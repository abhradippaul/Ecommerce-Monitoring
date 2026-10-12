import os
from pathlib import Path
from typing import Optional, List
import jwt
from fastapi import Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logger import logger
from app.schemas.auth import UserRole, AuthUser

_cached_public_key: Optional[str] = None


def get_public_key() -> str:
    global _cached_public_key
    if _cached_public_key is not None:
        return _cached_public_key

    key_path = Path(settings.jwt_public_key_file_location)
    if not key_path.is_absolute():
        # Search relative to current working dir or Payment-Service directory
        base_dir = Path(__file__).resolve().parent.parent.parent
        resolved = base_dir / settings.jwt_public_key_file_location
        if resolved.exists():
            key_path = resolved

    if not key_path.exists():
        logger.warn(f"JWT public key not found at {key_path}")
        return ""

    with open(key_path, "r", encoding="utf-8") as f:
        _cached_public_key = f.read()
    return _cached_public_key


def verify_access_token(token: str) -> AuthUser:
    public_key = get_public_key()
    if not public_key:
        raise ValueError("Public key is not configured or available")

    decoded = jwt.decode(
        token,
        public_key,
        algorithms=["ES256", "RS256"],
        issuer="auth-service",
    )

    token_id = decoded.get("id")
    role_str = decoded.get("role")

    if not isinstance(token_id, str) or not role_str:
        raise ValueError("Invalid access token payload")

    try:
        role = UserRole(role_str)
    except ValueError:
        raise ValueError("Invalid access token payload")

    return AuthUser(user_id=token_id, role=role)


async def authenticate_token(request: Request) -> AuthUser:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Access token missing", "error": "Authentication required"},
        )

    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Access token missing", "error": "Authentication required"},
        )

    token = parts[1]
    try:
        user = verify_access_token(token)
        request.state.user = user
        return user
    except Exception as error:
        logger.error(f"JWT validation failed: {error}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"message": "Invalid or expired token", "error": str(error)},
        )


async def optional_auth(request: Request) -> Optional[AuthUser]:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None

    parts = auth_header.split(" ")
    if len(parts) == 2 and parts[0].lower() == "bearer":
        try:
            user = verify_access_token(parts[1])
            request.state.user = user
            return user
        except Exception as error:
            logger.warn(f"Optional auth token validation failed: {error}")
    return None


def require_role(allowed_roles: List[UserRole]):
    async def role_checker(user: AuthUser = Depends(authenticate_token)) -> AuthUser:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"message": "Unauthorized", "error": "User is not authenticated"},
            )
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"message": "Forbidden", "error": "Insufficient permissions for this resource"},
            )
        return user

    return role_checker
