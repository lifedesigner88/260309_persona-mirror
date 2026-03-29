from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.common.db import get_db

from .schemas import (
    DeleteAccountRequest,
    LoginRequest,
    ResendVerificationRequest,
    ResetPinConfirm,
    ResetPinRequest,
    SessionResponse,
    SignupRequest,
    UserResponse,
    VerifyRequest,
)
from .service import (
    build_session,
    clear_session_cookie,
    confirm_pin_reset,
    create_user,
    delete_current_user_account,
    get_current_user,
    request_pin_reset,
    resend_verification_code,
    to_user_response,
    verify_otp,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> UserResponse:
    return create_user(payload, db)


@router.post("/verify", status_code=status.HTTP_204_NO_CONTENT)
def verify(payload: VerifyRequest, db: Session = Depends(get_db)) -> None:
    verify_otp(payload, db)


@router.post("/verify/resend", status_code=status.HTTP_204_NO_CONTENT)
def verify_resend(payload: ResendVerificationRequest, db: Session = Depends(get_db)) -> None:
    resend_verification_code(payload, db)


@router.post("/reset-pin/request", status_code=status.HTTP_204_NO_CONTENT)
def reset_pin_request(payload: ResetPinRequest, db: Session = Depends(get_db)) -> None:
    request_pin_reset(payload, db)


@router.post("/reset-pin/confirm", status_code=status.HTTP_204_NO_CONTENT)
def reset_pin_confirm(payload: ResetPinConfirm, db: Session = Depends(get_db)) -> None:
    confirm_pin_reset(payload, db)


@router.post("/login", response_model=SessionResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> SessionResponse:
    return build_session(payload, response, db)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> Response:
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    return clear_session_cookie(response)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    payload: DeleteAccountRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    delete_current_user_account(payload, current_user, db)
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    return clear_session_cookie(response)


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)) -> UserResponse:
    return to_user_response(current_user)
