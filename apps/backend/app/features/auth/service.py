import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.common.security import (
    AUTH_COOKIE_NAME,
    create_access_token,
    decode_access_token,
    get_cookie_settings,
    hash_password,
    verify_password_and_update,
)

from .email import send_otp_email, send_reset_pin_email
from .models import User
from .schemas import LoginRequest, ResetPinConfirm, ResetPinRequest, SessionResponse, SignupRequest, UserResponse, VerifyRequest

security_scheme = HTTPBearer(auto_error=False)
ADMIN_SEED_PASSWORD = os.getenv("ADMIN_SEED_PASSWORD", "Admin#2026!Mirror")
ADMIN_SEED_EMAIL = os.getenv("ADMIN_SEED_EMAIL", "admin@example.com")


def to_user_response(user: User) -> UserResponse:
    return UserResponse(user_id=user.user_id, email=user.email, is_admin=user.is_admin, created_at=user.created_at)


def sync_admin_seed(db: Session) -> None:
    admin = db.scalar(select(User).where(User.email == ADMIN_SEED_EMAIL))
    if admin is None:
        db.add(
            User(
                email=ADMIN_SEED_EMAIL,
                password_hash=hash_password(ADMIN_SEED_PASSWORD),
                is_admin=True,
                is_verified=True,
            )
        )
    else:
        admin.is_admin = True
        admin.is_verified = True
        admin.email = ADMIN_SEED_EMAIL
        is_valid, updated_hash = verify_password_and_update(ADMIN_SEED_PASSWORD, admin.password_hash)
        if not is_valid:
            admin.password_hash = hash_password(ADMIN_SEED_PASSWORD)
        elif updated_hash:
            admin.password_hash = updated_hash
    db.commit()


def _generate_otp() -> tuple[str, datetime]:
    otp = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    return otp, expires_at


def create_user(payload: SignupRequest, db: Session) -> UserResponse:
    if db.scalar(select(User).where(User.email == payload.email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    otp, expires_at = _generate_otp()
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_verified=False,
        otp_code=otp,
        otp_expires_at=expires_at,
        is_admin=False,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc
    db.refresh(user)
    send_otp_email(user.email, otp)
    return to_user_response(user)


def verify_otp(payload: VerifyRequest, db: Session) -> None:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or user.otp_code is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    if user.is_verified:
        return
    now = datetime.now(timezone.utc)
    expires = user.otp_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires is None or now > expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code expired — request a new one")
    if not secrets.compare_digest(user.otp_code, payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()


def request_pin_reset(payload: ResetPinRequest, db: Session) -> None:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        return  # silently ignore — don't reveal if email exists
    otp, expires_at = _generate_otp()
    user.otp_code = otp
    user.otp_expires_at = expires_at
    db.commit()
    send_reset_pin_email(user.email, otp)


def confirm_pin_reset(payload: ResetPinConfirm, db: Session) -> None:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or user.otp_code is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    now = datetime.now(timezone.utc)
    expires = user.otp_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires is None or now > expires:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code expired — request a new one")
    if not secrets.compare_digest(user.otp_code, payload.otp):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")
    user.password_hash = hash_password(payload.new_pin)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()


def build_session(payload: LoginRequest, response: Response, db: Session) -> SessionResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified — check your inbox")

    is_valid, updated_hash = verify_password_and_update(payload.password, user.password_hash)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if updated_hash:
        user.password_hash = updated_hash
        db.commit()

    access_token = create_access_token(subject=str(user.user_id), is_admin=user.is_admin)
    response.set_cookie(AUTH_COOKIE_NAME, access_token, **get_cookie_settings())
    return SessionResponse(user_id=user.user_id, is_admin=user.is_admin)


def clear_session_cookie(response: Response) -> Response:
    cookie_settings = get_cookie_settings()
    response.delete_cookie(
        AUTH_COOKIE_NAME,
        path=str(cookie_settings["path"]),
        secure=bool(cookie_settings["secure"]),
        httponly=bool(cookie_settings["httponly"]),
        samesite=str(cookie_settings["samesite"]),
    )
    return response


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_access_token(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token"
        ) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.scalar(select(User).where(User.user_id == int(user_id)))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user
