from datetime import time

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.features.auth.models import User

from .interview_slots import derive_interview_time_slot
from .schemas import VerificationApplyRequest, VerificationStatusResponse

VALID_INTERVIEW_DATES = {"2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"}


def _require_text(value: str, label: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 필수 입력 항목입니다.",
        )
    return normalized


def _validate_payload(payload: VerificationApplyRequest) -> None:
    _require_text(payload.name, "이름")
    _require_text(payload.residence, "거주지")
    _require_text(payload.phone, "휴대폰 번호")
    _require_text(payload.github_address, "깃허브 주소")
    _require_text(payload.notion_url, "노션 링크")

    date_str = payload.interview_date.isoformat()
    if date_str not in VALID_INTERVIEW_DATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 면접 날짜입니다. (3/19~3/22)",
        )

    if payload.gender not in ("M", "F"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="성별은 'M' 또는 'F'만 허용됩니다.",
        )

    if not (time(9, 0) <= payload.interview_start_time < time(17, 0)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="면접 시작시간은 09:00 이상 17:00 미만이어야 합니다.",
        )

    if not (1 <= payload.interview_room <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="면접 방 번호는 1~5 사이여야 합니다.",
        )


def _write_payload_to_user(payload: VerificationApplyRequest, user: User) -> None:
    interview_time_slot = derive_interview_time_slot(payload.interview_start_time)
    if interview_time_slot is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="입력한 시작시간으로 타임 슬롯을 계산할 수 없습니다.",
        )

    user.name = _require_text(payload.name, "이름")
    user.gender = payload.gender
    user.birth_date = payload.birth_date
    user.residence = _require_text(payload.residence, "거주지")
    user.phone = _require_text(payload.phone, "휴대폰 번호")
    user.github_address = _require_text(payload.github_address, "깃허브 주소")
    user.notion_url = _require_text(payload.notion_url, "노션 링크")
    user.interview_date = payload.interview_date
    user.interview_start_time = payload.interview_start_time
    user.interview_time_slot = interview_time_slot
    user.interview_room = payload.interview_room


def apply_verification(payload: VerificationApplyRequest, user: User, db: Session) -> VerificationStatusResponse:
    if user.applicant_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 인증 신청이 접수되었습니다. 대기 중에는 수정할 수 없습니다.",
        )

    _validate_payload(payload)
    _write_payload_to_user(payload, user)

    if user.applicant_status != "approved":
        user.applicant_status = "pending"

    db.commit()
    db.refresh(user)

    return VerificationStatusResponse(
        applicant_status=user.applicant_status,
        name=user.name,
        interview_date=user.interview_date,
        interview_start_time=user.interview_start_time,
        interview_time_slot=user.interview_time_slot,
        interview_room=user.interview_room,
    )


def get_my_status(user: User) -> VerificationStatusResponse:
    return VerificationStatusResponse(
        applicant_status=user.applicant_status,
        name=user.name,
        interview_date=user.interview_date,
        interview_start_time=user.interview_start_time,
        interview_time_slot=user.interview_time_slot,
        interview_room=user.interview_room,
    )
