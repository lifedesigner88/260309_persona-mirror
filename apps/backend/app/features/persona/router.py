from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.db import get_db
from app.features.auth.models import User
from app.features.auth.service import get_current_user

from .models import Persona
from .schemas import AskRequest, AskResponse, PersonaChatHistoryResponse, PersonaChatResetResponse
from .service import ask_persona, list_chat_messages, reset_chat_session

router = APIRouter(prefix="/persona", tags=["persona"])


@router.get("/{persona_id}")
def get_persona(persona_id: str, db: Session = Depends(get_db)) -> dict:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    owner = db.scalar(select(User).where(User.user_id == persona.user_id))
    return {
        "persona_id": persona.persona_id,
        "title": persona.title,
        "data_eng": persona.data_eng,
        "data_kor": persona.data_kor,
        "email": owner.email if owner else None,
        "github_address": owner.github_address if owner else None,
        "notion_url": owner.notion_url if owner else None,
    }


@router.post("/{persona_id}/ask", response_model=AskResponse)
def ask(
    persona_id: str,
    body: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AskResponse:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    answer = ask_persona(
        db,
        persona=persona,
        viewer_user_id=current_user.user_id,
        question=body.question,
        lang=body.lang,
    )
    return AskResponse(answer=answer)


@router.get("/{persona_id}/chat", response_model=PersonaChatHistoryResponse)
def get_chat_history(
    persona_id: str,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonaChatHistoryResponse:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    messages = list_chat_messages(
        db,
        persona_id=persona_id,
        viewer_user_id=current_user.user_id,
        lang="ko" if lang.startswith("ko") else "en",
    )
    return PersonaChatHistoryResponse(messages=messages)


@router.post("/{persona_id}/chat/reset", response_model=PersonaChatResetResponse)
def reset_chat(
    persona_id: str,
    lang: str = "en",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PersonaChatResetResponse:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    session_id = reset_chat_session(
        db,
        persona_id=persona_id,
        viewer_user_id=current_user.user_id,
        lang="ko" if lang.startswith("ko") else "en",
    )
    return PersonaChatResetResponse(session_id=session_id)
