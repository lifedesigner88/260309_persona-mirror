import os
from datetime import datetime, timedelta, timezone
from typing import Literal, cast

import jwt
from passlib.context import CryptContext

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "pm_access_token")
AUTH_COOKIE_SAMESITE = os.getenv("AUTH_COOKIE_SAMESITE", "lax").lower()
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY must be set")

if len(JWT_SECRET_KEY.encode("utf-8")) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be at least 32 bytes for HS256")

if AUTH_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("AUTH_COOKIE_SAMESITE must be one of: lax, strict, none")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(*, subject: str, is_admin: bool) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "is_admin": is_admin, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def get_cookie_settings() -> dict[str, bool | str | int | Literal["lax", "strict", "none"]]:
    return {
        "httponly": True,
        "secure": AUTH_COOKIE_SECURE,
        "samesite": cast(Literal["lax", "strict", "none"], AUTH_COOKIE_SAMESITE),
        "max_age": JWT_EXPIRE_MINUTES * 60,
        "path": "/",
    }
