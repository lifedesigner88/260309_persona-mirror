from fastapi import APIRouter, Depends
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
