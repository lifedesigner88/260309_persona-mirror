from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class CaptureInterviewPayload(BaseModel):
    selfSummary: str
    coreValues: str
    speakingStyle: str
    keywords: str


class CaptureVoicePayload(BaseModel):
    inputMode: Literal["upload", "record", "later"]
    sampleFileName: str
    toneNotes: str
    deliveryGoal: str


class CaptureImagePayload(BaseModel):
    inputMode: Literal["upload", "camera", "later"]
    referenceFileName: str
    visualDirection: str
    framingNotes: str


class CaptureDraftRequest(BaseModel):
    interview: CaptureInterviewPayload
    voice: CaptureVoicePayload
    image: CaptureImagePayload
    updatedAt: datetime | None = None


class CaptureJobResponse(BaseModel):
    id: str
    owner_user_id: str
    status: str
    payload: CaptureDraftRequest
    created_at: datetime
    updated_at: datetime
