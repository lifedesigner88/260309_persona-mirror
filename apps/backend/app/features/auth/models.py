from __future__ import annotations

from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, Integer, String, Time, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.db import Base

if TYPE_CHECKING:
    from app.features.capture.models import CaptureJob


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    otp_code: Mapped[str | None] = mapped_column(String(6), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    github_address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notion_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # 소프트웨어마에스트로 17기 합격자 인증 필드
    name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(1), nullable=True)  # 'M' | 'F'
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    residence: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    interview_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    interview_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    interview_time_slot: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    interview_room: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    applicant_status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=text("'none'")
    )  # none | pending | approved | rejected

    capture_jobs: Mapped[list["CaptureJob"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
