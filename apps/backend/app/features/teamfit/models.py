from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db import Base


class TeamfitProfile(Base):
    __tablename__ = "teamfit_profiles"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    completion_stage: Mapped[str] = mapped_column(String(20), nullable=False, default="step1")
    preferred_role: Mapped[str] = mapped_column(String(80), nullable=False)
    working_style: Mapped[str] = mapped_column(String(80), nullable=False)
    commitment_pace: Mapped[str] = mapped_column(String(80), nullable=False)
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    problem_focus: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    domains: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    tech_stack: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    impact_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    mbti: Mapped[str | None] = mapped_column(String(8), nullable=True)
    mbti_axis_values: Mapped[dict[str, int] | None] = mapped_column(JSON, nullable=True)
    one_liner: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding_json: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TeamfitExplorerProfile(Base):
    __tablename__ = "teamfit_explorer_profiles"

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    mbti: Mapped[str] = mapped_column(String(8), nullable=False)
    mbti_axis_values: Mapped[dict[str, int]] = mapped_column(JSON, nullable=False, default=dict)
    sdg_tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    narrative_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    extracted_signals_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommendation_embedding_input: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation_embedding_json: Mapped[list[float] | None] = mapped_column(JSON, nullable=True)
    extraction_version: Mapped[str | None] = mapped_column(String(48), nullable=True)
    extracted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TeamfitExplorerTurn(Base):
    __tablename__ = "teamfit_explorer_turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    phase: Mapped[str] = mapped_column(String(20), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class TeamfitFitCheck(Base):
    __tablename__ = "teamfit_fit_checks"

    viewer_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    target_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fit_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
