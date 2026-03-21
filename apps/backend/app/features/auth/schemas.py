from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

NormalizedUserId = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=3, max_length=64),
]
# Signup user_id: exactly 6 uppercase alphanumeric chars (client-generated)
SignupUserIdValue = Annotated[
    str,
    StringConstraints(min_length=6, max_length=6, pattern=r"^[A-Z0-9]{6}$"),
]
# Signup: exactly 4 digits (demo PIN)
SignupPasswordValue = Annotated[
    str,
    StringConstraints(min_length=4, max_length=4, pattern=r"^\d{4}$"),
]
# Login: exactly 4 digits (same as signup PIN)
LoginPasswordValue = Annotated[
    str,
    StringConstraints(min_length=4, max_length=4, pattern=r"^\d{4}$"),
]


class SignupRequest(BaseModel):
    user_id: SignupUserIdValue
    password: SignupPasswordValue
    email: EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: LoginPasswordValue


class VerifyRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPinRequest(BaseModel):
    email: EmailStr


class ResetPinConfirm(BaseModel):
    email: EmailStr
    otp: str
    new_pin: SignupPasswordValue


class SessionResponse(BaseModel):
    user_id: str
    is_admin: bool


class UserResponse(BaseModel):
    user_id: str
    email: str
    is_admin: bool
    created_at: datetime
