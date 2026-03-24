from datetime import date

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import DashboardGrid, MemberCard, MemberCheckState, MemberCheckUpdate
from .service import get_dashboard, get_slot_members, set_member_check

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardGrid)
def dashboard(db: Session = Depends(get_db)) -> DashboardGrid:
    """공개 대시보드 — 인증 불필요"""
    return get_dashboard(db)


@router.get("/slot", response_model=list[MemberCard])
def slot_members(
    interview_date: date = Query(..., description="면접 날짜 (YYYY-MM-DD)"),
    time_slot: int = Query(..., ge=1, le=5, description="타임 슬롯 번호 (1-5)"),
    room: int = Query(..., ge=1, le=5, description="방 번호 (1-5)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MemberCard]:
    """슬롯 멤버 카드 — 관리자 또는 합격자 인증 완료자만 조회 가능"""
    return get_slot_members(interview_date, time_slot, room, current_user, db)


@router.put("/member-checks/{target_user_id}", response_model=MemberCheckState)
def update_member_check(
    payload: MemberCheckUpdate,
    target_user_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MemberCheckState:
    """로그인 사용자의 멤버 체크 상태 저장"""
    return set_member_check(target_user_id, payload.is_checked, current_user, db)
