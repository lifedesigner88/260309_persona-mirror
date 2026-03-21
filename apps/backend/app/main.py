import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.common.db import Base, SessionLocal, engine
from app.common.seed import sync_demo_seed
from app.features.admin.router import router as admin_router
from app.features.auth import models as auth_models  # noqa: F401
from app.features.auth.router import router as auth_router
from app.features.auth.service import sync_admin_seed
from app.features.capture import models as capture_models  # noqa: F401
from app.features.capture.router import router as capture_router
from app.features.persona import models as persona_models  # noqa: F401
from app.features.persona.router import router as persona_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        sync_admin_seed(db)
        sync_demo_seed(db)
    yield


app = FastAPI(title="PersonaMirror Backend", lifespan=lifespan)

origins_raw = os.getenv("BACKEND_CORS_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(capture_router)
app.include_router(persona_router)
