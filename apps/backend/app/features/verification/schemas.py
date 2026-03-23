from datetime import date, time

from pydantic import BaseModel


class VerificationApplyRequest(BaseModel):
    name: str
    gender: str  # 'M' | 'F'
    birth_date: date
    residence: str
    phone: str
    github_address: str
    notion_url: str
    interview_date: date
    interview_start_time: time
    interview_room: int  # 1-5


class VerificationStatusResponse(BaseModel):
    applicant_status: str
    name: str | None
    interview_date: date | None
    interview_start_time: time | None
    interview_time_slot: int | None
    interview_room: int | None
