from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
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
    # Bilingual PersonaProfile blobs — matches frontend PersonaProfile type
    data_eng: Mapped[dict] = mapped_column(JSON, nullable=False)
    data_kor: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class PersonaChatMessage(Base):
    __tablename__ = "persona_chat_messages"

    message_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    persona_id: Mapped[str] = mapped_column(
        String(6), ForeignKey("personas.persona_id", ondelete="CASCADE"), nullable=False, index=True
    )
    viewer_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    session_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1, index=True)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="en")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
