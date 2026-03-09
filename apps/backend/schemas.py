from datetime import datetime

from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
    user_id: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=4, max_length=128)


class LoginRequest(BaseModel):
    user_id: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=4, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    is_admin: bool


class UserResponse(BaseModel):
    user_id: str
    is_admin: bool
    created_at: datetime

