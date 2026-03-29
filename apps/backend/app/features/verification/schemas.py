from datetime import date, time

from pydantic import BaseModel


class VerificationApplyRequest(BaseModel):
    name: str
    gender: str  # 'M' | 'F'
    birth_date: date | None = None
    residence: str | None = None
    invite_code: str | None = None
    github_address: str | None = None
    notion_url: str | None = None
    interview_date: date
    interview_start_time: time
    interview_room: int  # 1-5


class VerificationInviteCodeCheckRequest(BaseModel):
    invite_code: str | None = None


class VerificationInviteCodeCheckResponse(BaseModel):
    matches_auto_approve_invite_code: bool


class VerificationStatusResponse(BaseModel):
    applicant_status: str
    name: str | None
    interview_date: date | None
    interview_start_time: time | None
    interview_time_slot: int | None
    interview_room: int | None
