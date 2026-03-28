import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.common.db import Base, SessionLocal, engine
from app.common.seed import sync_demo_seed
from app.features.admin.router import router as admin_router
from app.features.auth import models as auth_models  # noqa: F401
from app.features.auth.router import router as auth_router
from app.features.auth.service import sync_admin_seed, sync_user_gender_defaults
from app.features.capture import models as capture_models  # noqa: F401
from app.features.capture.router import router as capture_router
from app.features.dashboard import models as dashboard_models  # noqa: F401
from app.features.dashboard.router import router as dashboard_router
from app.features.persona import models as persona_models  # noqa: F401
from app.features.persona.router import router as persona_router
from app.features.teamfit import models as teamfit_models  # noqa: F401
from app.features.teamfit.router import router as teamfit_router
from app.features.teamfit.seed import sync_teamfit_demo_seed
from app.features.teamfit.service import ensure_teamfit_explorer_schema, ensure_teamfit_pgvector_schema
from app.features.verification.router import router as verification_router


def _column_names(connection, inspector, table_name: str) -> set[str]:
    if connection.dialect.name == "postgresql":
        rows = connection.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = :table_name
                  AND table_schema = ANY(current_schemas(false))
                """
            ),
            {"table_name": table_name},
        )
        return {str(row[0]) for row in rows}

    return {column["name"] for column in inspector.get_columns(table_name)}


def ensure_postgres_user_gender_constraints() -> None:
    with engine.connect() as connection:
        if connection.dialect.name != "postgresql":
            return

        try:
            # Startup should stay available even if an older local session still holds a lock.
            connection.execute(text("SET LOCAL lock_timeout = '1000ms'"))
            connection.execute(text("ALTER TABLE users ALTER COLUMN gender SET DEFAULT 'M'"))
            connection.execute(text("ALTER TABLE users ALTER COLUMN gender SET NOT NULL"))
            connection.commit()
        except SQLAlchemyError:
            connection.rollback()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        inspector = inspect(connection)
        user_columns = _column_names(connection, inspector, "users")
        if "interview_start_time" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN interview_start_time TIME"))
        if inspector.has_table("persona_chat_messages"):
            chat_columns = _column_names(connection, inspector, "persona_chat_messages")
            if "session_id" not in chat_columns:
                connection.execute(
                    text("ALTER TABLE persona_chat_messages ADD COLUMN session_id INTEGER NOT NULL DEFAULT 1")
                )
        if inspector.has_table("teamfit_profiles"):
            teamfit_columns = _column_names(connection, inspector, "teamfit_profiles")
            if "mbti_axis_values" not in teamfit_columns:
                connection.execute(text("ALTER TABLE teamfit_profiles ADD COLUMN mbti_axis_values JSON"))
    with SessionLocal() as db:
        ensure_teamfit_pgvector_schema(db)
        ensure_teamfit_explorer_schema(db)
        sync_admin_seed(db)
        sync_demo_seed(db)
        sync_teamfit_demo_seed(db)
        sync_user_gender_defaults(db)
    ensure_postgres_user_gender_constraints()
    yield


app = FastAPI(title="SoMa Community Backend", lifespan=lifespan)

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
app.include_router(verification_router)
app.include_router(dashboard_router)
app.include_router(teamfit_router)
