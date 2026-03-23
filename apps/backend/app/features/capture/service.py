import os

import anthropic
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.features.auth.models import User

from .models import CaptureJob
from .schemas import CaptureDraftRequest, ChatRequest, ChatResponse, CaptureJobResponse, PersonaResultResponse

_INTERVIEW_COMPLETE_SIGNAL = "[INTERVIEW_COMPLETE]"

_SYSTEM_PROMPT = """You are a warm, curious persona interviewer for PersonaMirror.
Your goal is to understand who this person is through natural conversation.

Ask exactly these 5 questions, one at a time, in order:
1. How would you describe yourself in a few words?
2. What are your top 3 core values?
3. How do others describe the way you communicate?
4. What drives you — what is your biggest life goal right now?
5. What single word or phrase feels most uniquely "you"?

Rules:
- Ask one question at a time. Wait for the answer before asking the next.
- Keep your tone warm and encouraging.
- After the user answers the 5th question, write a brief warm closing (1-2 sentences) and end your message with exactly: """ + _INTERVIEW_COMPLETE_SIGNAL + """
- Do not add the signal before the 5th answer is given."""


def chat_interview(payload: ChatRequest) -> ChatResponse:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    if not messages:
        messages = [{"role": "user", "content": "Hello, I'm ready to start."}]
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=_SYSTEM_PROMPT,
        messages=messages,
    )
    reply = response.content[0].text
    is_complete = _INTERVIEW_COMPLETE_SIGNAL in reply
    clean_reply = reply.replace(_INTERVIEW_COMPLETE_SIGNAL, "").strip()
    return ChatResponse(message=clean_reply, is_complete=is_complete)


def to_capture_job_response(job: CaptureJob) -> CaptureJobResponse:
    result = None
    if job.result and job.persona_id:
        result = PersonaResultResponse(
            persona_id=job.persona_id,
            archetype=job.result.get("archetype", ""),
            top3_values=job.result.get("top3_values", []),
            one_liner=job.result.get("one_liner", ""),
        )
    return CaptureJobResponse(
        id=job.id,
        owner_user_id=job.owner.user_id,
        status=job.status,
        payload=CaptureDraftRequest.model_validate(job.payload),
        result=result,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def require_capture_job(db: Session, job_id: str) -> CaptureJob:
    job = db.scalar(select(CaptureJob).options(selectinload(CaptureJob.owner)).where(CaptureJob.id == job_id))
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture job not found")
    return job


def create_capture_job(db: Session, payload: CaptureDraftRequest, current_user: User) -> CaptureJobResponse:
    job = CaptureJob(
        owner_id=current_user.user_id,
        status="pending",
        payload=payload.model_dump(mode="json"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return to_capture_job_response(job)


def list_capture_jobs(db: Session, current_user: User) -> list[CaptureJobResponse]:
    jobs = db.scalars(
        select(CaptureJob)
        .options(selectinload(CaptureJob.owner))
        .where(CaptureJob.owner_id == current_user.user_id)
        .order_by(CaptureJob.created_at.desc())
    ).all()
    return [to_capture_job_response(job) for job in jobs]


def get_capture_job(db: Session, job_id: str, current_user: User) -> CaptureJobResponse:
    job = require_capture_job(db, job_id)
    if job.owner_id != current_user.user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return to_capture_job_response(job)


def delete_capture_job(db: Session, job_id: str, current_user: User) -> None:
    job = require_capture_job(db, job_id)
    if job.owner_id != current_user.user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    db.delete(job)
    db.commit()
