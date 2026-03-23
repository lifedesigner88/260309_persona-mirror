from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.schemas import UserResponse
from app.features.auth.service import require_admin, to_user_response

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
def admin_users(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> list[UserResponse]:
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [to_user_response(user) for user in users]


@router.get("/verifications", response_model=list[UserResponse])
def pending_verifications(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[UserResponse]:
    """인증 대기 중인 신청 목록"""
    users = db.scalars(
        select(User)
        .where(User.applicant_status == "pending")
        .order_by(User.created_at.asc())
    ).all()
    return [to_user_response(user) for user in users]


@router.post("/verifications/{user_id}/approve", response_model=UserResponse)
def approve_verification(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserResponse:
    """합격자 인증 승인"""
    user = db.scalar(select(User).where(User.user_id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    if user.applicant_status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="인증 대기 상태가 아닙니다.")
    user.applicant_status = "approved"
    db.commit()
    db.refresh(user)
    return to_user_response(user)


@router.post("/verifications/{user_id}/reject", response_model=UserResponse)
def reject_verification(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserResponse:
    """합격자 인증 거부"""
    user = db.scalar(select(User).where(User.user_id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    if user.applicant_status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="인증 대기 상태가 아닙니다.")
    user.applicant_status = "rejected"
    db.commit()
    db.refresh(user)
    return to_user_response(user)


@router.post("/verifications/{user_id}/revoke", response_model=UserResponse)
def revoke_verification(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> UserResponse:
    """합격자 인증 취소"""
    user = db.scalar(select(User).where(User.user_id == user_id))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="유저를 찾을 수 없습니다.")
    if user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 인증은 취소할 수 없습니다.")
    if user.applicant_status != "approved":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="인증 완료 상태가 아닙니다.")
    user.applicant_status = "none"
    db.commit()
    db.refresh(user)
    return to_user_response(user)
