from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.common.db import Base


class Persona(Base):
    __tablename__ = "personas"

    # 6-char alphanumeric — public-facing URL key (e.g. /persona/d31sf2)
    persona_id: Mapped[str] = mapped_column(String(6), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    # User-facing label — lets the owner distinguish multiple personas
    title: Mapped[str] = mapped_column(String(128), nullable=False, default="My Persona")
    # Full PersonaProfile blob — matches frontend PersonaProfile type
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
