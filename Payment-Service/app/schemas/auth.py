from enum import Enum
from typing import Optional
from pydantic import BaseModel


class UserRole(str, Enum):
    ADMIN = "admin"
    SELLER = "seller"
    BUYER = "buyer"


class AuthUser(BaseModel):
    user_id: str
    role: UserRole

    # For JS-style dictionary compatibility if needed
    @property
    def userId(self) -> str:
        return self.user_id


class AccessTokenPayload(BaseModel):
    id: str
    role: UserRole


class RefreshTokenPayload(BaseModel):
    id: str
