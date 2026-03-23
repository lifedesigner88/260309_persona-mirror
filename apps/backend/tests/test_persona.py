from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.auth.models import User
from app.features.persona.models import Persona
from app.common.security import hash_password

_PERSONA_ID = "tstprs"
_OWNER_ID = "TST001"

_PERSONA_DATA = {
    "archetype": "test archetype",
    "headline": "Test Person",
    "one_liner": "A person who tests things.",
    "top3_values": ["Honesty", "Curiosity", "Growth"],
    "strengths": ["Attention to detail"],
    "watchouts": ["Overthinking"],
    "goals_vision": {"lifetime_mission": "To test all the things."},
    "mbti": {"type": "INTJ"},
}


@pytest.fixture(autouse=True)
def seed_persona():
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.user_id == _OWNER_ID))
        if user is None:
            user = User(
                user_id=_OWNER_ID,
                email="testpersona@example.com",
                password_hash=hash_password("1234"),
                is_verified=True,
            )
            db.add(user)
            db.flush()
        existing = db.scalar(select(Persona).where(Persona.persona_id == _PERSONA_ID))
        if existing is None:
            db.add(
                Persona(
                    persona_id=_PERSONA_ID,
                    owner_user_id=_OWNER_ID,
                    title="Test Persona",
                    data=_PERSONA_DATA,
                )
            )
        db.commit()


def test_get_persona(client):
    resp = client.get(f"/persona/{_PERSONA_ID}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Persona"
    assert data["archetype"] == "test archetype"


def test_get_persona_not_found(client):
    resp = client.get("/persona/xxxxxx")
    assert resp.status_code == 404


def test_ask_persona(client):
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="I value honesty above all.")]

    with patch("app.features.persona.service.anthropic.Anthropic") as mock_anthropic:
        mock_anthropic.return_value.messages.create.return_value = mock_response
        resp = client.post(f"/persona/{_PERSONA_ID}/ask", json={"question": "What do you value most?"})

    assert resp.status_code == 200
    assert resp.json()["answer"] == "I value honesty above all."


def test_ask_persona_not_found(client):
    resp = client.post("/persona/xxxxxx/ask", json={"question": "Hello?"})
    assert resp.status_code == 404


def test_ask_persona_empty_question(client):
    resp = client.post(f"/persona/{_PERSONA_ID}/ask", json={"question": ""})
    assert resp.status_code == 422
