from datetime import date, datetime, time
from typing import Annotated

from pydantic import BaseModel, EmailStr, StringConstraints

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
    user_id: int
    is_admin: bool


class UserResponse(BaseModel):
    user_id: int
    email: str
    is_admin: bool
    created_at: datetime
    github_address: str | None = None
    notion_url: str | None = None
    name: str | None = None
    gender: str | None = None
    birth_date: date | None = None
    residence: str | None = None
    phone: str | None = None
    interview_date: date | None = None
    interview_start_time: time | None = None
    interview_time_slot: int | None = None
    interview_room: int | None = None
    applicant_status: str = "none"
