from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .schemas import VerificationApplyRequest, VerificationStatusResponse
from .service import apply_verification, get_my_status

router = APIRouter(prefix="/verification", tags=["verification"])


@router.post("/apply", response_model=VerificationStatusResponse)
def apply(
    payload: VerificationApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VerificationStatusResponse:
    return apply_verification(payload, current_user, db)


@router.get("/me", response_model=VerificationStatusResponse)
def my_status(current_user: User = Depends(get_current_user)) -> VerificationStatusResponse:
    return get_my_status(current_user)
