# Thin uvicorn entrypoint; the actual FastAPI app is assembled in app/main.py.
from app.main import app as app  # noqa: F401
