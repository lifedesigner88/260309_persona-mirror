from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

NormalizedUserId = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=64),
]
PasswordValue = Annotated[
    str,
    StringConstraints(min_length=8, max_length=128),
]


class SignupRequest(BaseModel):
    user_id: NormalizedUserId
    password: PasswordValue


class LoginRequest(BaseModel):
    user_id: NormalizedUserId
    password: PasswordValue


class SessionResponse(BaseModel):
    user_id: str
    is_admin: bool


class UserResponse(BaseModel):
    user_id: str
    is_admin: bool
    created_at: datetime
