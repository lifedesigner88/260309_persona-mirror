from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.features.auth.models import User

from .models import CaptureJob
from .schemas import CaptureDraftRequest, CaptureJobResponse


def to_capture_job_response(job: CaptureJob) -> CaptureJobResponse:
    return CaptureJobResponse(
        id=job.id,
        owner_user_id=job.owner.user_id,
        status=job.status,
        payload=CaptureDraftRequest.model_validate(job.payload),
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


def create_capture_job(db: Session, payload: CaptureDraftRequest, current_user: User) -> CaptureJobResponse:
    job = CaptureJob(
        owner_id=current_user.id,
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
        .where(CaptureJob.owner_id == current_user.id)
        .order_by(CaptureJob.created_at.desc())
    ).all()
    return [to_capture_job_response(job) for job in jobs]


def get_capture_job(db: Session, job_id: str, current_user: User) -> CaptureJobResponse:
    job = db.scalar(select(CaptureJob).options(selectinload(CaptureJob.owner)).where(CaptureJob.id == job_id))
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capture job not found")
    if job.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return to_capture_job_response(job)
