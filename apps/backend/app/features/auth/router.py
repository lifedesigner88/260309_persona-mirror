from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.common.db import get_db

from .schemas import LoginRequest, SessionResponse, SignupRequest, UserResponse
from .service import build_session, clear_session_cookie, create_user, get_current_user, to_user_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> UserResponse:
    return create_user(payload, db)


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


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)) -> UserResponse:
    return to_user_response(current_user)
