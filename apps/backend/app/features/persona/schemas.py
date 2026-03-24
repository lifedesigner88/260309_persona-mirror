from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    lang: str = "en"


class AskResponse(BaseModel):
    answer: str


class PersonaChatMessageResponse(BaseModel):
    message_id: int
    role: Literal["user", "assistant"]
    lang: str
    content: str
    created_at: datetime


class PersonaChatHistoryResponse(BaseModel):
    messages: list[PersonaChatMessageResponse]


class PersonaChatResetResponse(BaseModel):
    session_id: int
