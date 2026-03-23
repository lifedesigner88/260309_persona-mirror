from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "assistant" | "user"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    message: str
    is_complete: bool


class CaptureInterviewPayload(BaseModel):
    messages: list[ChatMessage]
    isComplete: bool = False


class CaptureVoicePayload(BaseModel):
    inputMode: Literal["upload", "record", "later"] = "later"
    sampleFileName: str = ""
    toneNotes: str = ""
    deliveryGoal: str = ""


class CaptureImagePayload(BaseModel):
    inputMode: Literal["upload", "camera", "later"] = "later"
    referenceFileName: str = ""
    visualDirection: str = ""
    framingNotes: str = ""


class CaptureDraftRequest(BaseModel):
    interview: CaptureInterviewPayload
    voice: CaptureVoicePayload = CaptureVoicePayload()
    image: CaptureImagePayload = CaptureImagePayload()
    updatedAt: datetime | None = None


class PersonaResultResponse(BaseModel):
    persona_id: str
    archetype: str
    top3_values: list[str]
    one_liner: str


class CaptureJobResponse(BaseModel):
    id: str
    owner_user_id: int
    status: str
    payload: CaptureDraftRequest
    result: PersonaResultResponse | None = None
    created_at: datetime
    updated_at: datetime
