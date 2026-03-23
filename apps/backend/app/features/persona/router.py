from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.db import get_db

from .models import Persona
from .schemas import AskRequest, AskResponse
from .service import ask_persona

router = APIRouter(prefix="/persona", tags=["persona"])


@router.get("/{persona_id}")
def get_persona(persona_id: str, db: Session = Depends(get_db)) -> dict:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    return {"title": persona.title, **persona.data}


@router.post("/{persona_id}/ask", response_model=AskResponse)
def ask(persona_id: str, body: AskRequest, db: Session = Depends(get_db)) -> AskResponse:
    persona = db.scalar(select(Persona).where(Persona.persona_id == persona_id))
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    answer = ask_persona(persona.data, body.question)
    return AskResponse(answer=answer)
