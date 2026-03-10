FROM python:3.11.15-slim

WORKDIR /workspace

ENV UV_PROJECT_ENVIRONMENT=/tmp/persona-backend-venv
ENV UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv

COPY apps/backend ./apps/backend

RUN uv sync --project apps/backend

EXPOSE 8000

CMD ["sh", "-c", "uv run --project apps/backend uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir apps/backend --env-file apps/backend/.env"]
