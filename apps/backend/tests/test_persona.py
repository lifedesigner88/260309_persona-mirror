from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from sqlalchemy import select

from app.common.db import SessionLocal
from app.common.security import hash_password
from app.features.auth.models import User
from app.features.persona.models import Persona, PersonaChatMessage
from app.features.persona.service import CHAT_RESPONSE_LIMITS

PERSONA_ID = "tstprs"

PERSONA_DATA_ENG = {
    "archetype": "test archetype",
    "headline": "Test Person",
    "one_liner": "A person who tests things.",
    "top3_values": ["Honesty", "Curiosity", "Growth"],
    "strengths": ["Attention to detail"],
    "watchouts": ["Overthinking"],
    "goals_vision": {
        "lifetime_mission": "To test all the things.",
        "current_decade_mission": "Ship grounded experiments.",
        "long_term_vision": "Build useful systems.",
        "long_term_directions": ["Education", "AI"]
    },
    "mbti": {"type": "INTJ"},
    "sdg_alignment": [],
    "identity_shifts": []
}
PERSONA_DATA_KO = {
    **PERSONA_DATA_ENG,
    "headline": "테스트 인물",
    "one_liner": "테스트를 좋아하는 사람입니다."
}


def _create_user(email: str, password: str = "1234", *, is_verified: bool = True) -> int:
    with SessionLocal() as db:
        user = User(
            email=email,
            password_hash=hash_password(password),
            is_verified=is_verified,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.user_id


def _seed_persona() -> int:
    owner_user_id = _create_user("testpersona@example.com")
    with SessionLocal() as db:
        db.add(
            Persona(
                persona_id=PERSONA_ID,
                user_id=owner_user_id,
                title="Test Persona",
                data_eng=PERSONA_DATA_ENG,
                data_kor=PERSONA_DATA_KO,
            )
        )
        db.commit()
    return owner_user_id


def test_get_persona(client):
    _seed_persona()

    response = client.get(f"/persona/{PERSONA_ID}")

    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Persona"
    assert data["data_eng"]["headline"] == "Test Person"
    assert data["data_kor"]["headline"] == "테스트 인물"


def test_get_persona_not_found(client):
    response = client.get("/persona/xxxxxx")
    assert response.status_code == 404


def test_ask_persona_requires_login(client):
    _seed_persona()

    response = client.post(f"/persona/{PERSONA_ID}/ask", json={"question": "Hello?", "lang": "en"})

    assert response.status_code == 401


def test_get_chat_history_requires_login(client):
    _seed_persona()

    response = client.get(f"/persona/{PERSONA_ID}/chat")

    assert response.status_code == 401


def test_ask_persona_persists_chat_history(client, user_session):
    _seed_persona()
    user_session(email="viewer@example.com")
    with SessionLocal() as db:
        viewer_user_id = db.scalar(select(User.user_id).where(User.email == "viewer@example.com"))
    assert viewer_user_id is not None

    mock_response = MagicMock()
    mock_response.content = [MagicMock(type="text", text="I value honesty above all.")]

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False),
        patch("app.features.persona.service.anthropic.Anthropic") as mock_anthropic,
    ):
        mock_anthropic.return_value.messages.create.return_value = mock_response
        response = client.post(
            f"/persona/{PERSONA_ID}/ask",
            json={"question": "What do you value most?", "lang": "en"},
        )

    assert response.status_code == 200
    assert response.json()["answer"] == "I value honesty above all."

    with SessionLocal() as db:
        messages = list(
            db.scalars(
                select(PersonaChatMessage)
                .where(
                    PersonaChatMessage.persona_id == PERSONA_ID,
                    PersonaChatMessage.viewer_user_id == viewer_user_id,
                )
                .order_by(PersonaChatMessage.message_id.asc())
            ).all()
        )

    assert [message.role for message in messages] == ["user", "assistant"]
    assert [message.content for message in messages] == [
        "What do you value most?",
        "I value honesty above all.",
    ]
    assert all(message.lang == "en" for message in messages)
    assert all(message.session_id == 1 for message in messages)


def test_ask_persona_shapes_long_answer_for_chat_ui(client, user_session):
    _seed_persona()
    user_session(email="viewer@example.com")

    long_answer = "\n".join(
        [
            "## Big picture",
            "- First long point about how I would approach the problem in a collaborative way.",
            "- Second long point with extra explanation that should not spill too far in the compact chat area.",
            "- Third long point that keeps going with more detail than the UI really needs right away.",
            "- Fourth point with additional context that can easily become too long for one reply.",
            "- Fifth point that would be better handled in a follow-up question.",
            "- Sixth point about documenting decisions, handling uncertainty, and keeping the team aligned in a way that easily pushes this answer past the desired chat size.",
            "- Seventh point adding even more explanation so the response has to be trimmed before it reaches the client side.",
            "- Eighth point with extra wording about product tradeoffs, user feedback loops, and team ownership in practice.",
            "- Ninth point about role clarity, decision logs, and visible weekly progress updates so the answer naturally keeps growing.",
            "- Tenth point about how documentation and shared vocabulary reduce confusion when the project direction starts to branch.",
            "- Eleventh point about staying calm under ambiguity while still turning messy requirements into concrete next actions.",
            "- Twelfth point about user interviews, prototype feedback, and how to turn early reactions into feature priorities.",
            "- Thirteenth point about balancing execution speed with trust, readability, and a clear handoff between teammates.",
            "Conclusion: start small, talk often, narrow the scope together, keep the first answer compact enough for the chat UI, and save deeper tradeoff discussion for a follow-up question instead of trying to solve everything in one message.",
        ]
    )
    mock_response = MagicMock()
    mock_response.content = [MagicMock(type="text", text=long_answer)]

    with (
        patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=False),
        patch("app.features.persona.service.anthropic.Anthropic") as mock_anthropic,
    ):
        mock_anthropic.return_value.messages.create.return_value = mock_response
        response = client.post(
            f"/persona/{PERSONA_ID}/ask",
            json={"question": "How would you work with a team?", "lang": "en"},
        )

    assert response.status_code == 200
    answer = response.json()["answer"]
    assert len(answer) <= CHAT_RESPONSE_LIMITS["en"]["max_chars"]
    assert len([line for line in answer.splitlines() if line.strip()]) <= CHAT_RESPONSE_LIMITS["en"]["max_lines"]
    assert answer.endswith("…")


def test_get_chat_history_returns_viewer_and_lang_scoped_messages(client, login_user):
    _seed_persona()
    viewer_user_id = _create_user("viewer@example.com")
    other_user_id = _create_user("other@example.com")

    with SessionLocal() as db:
        db.add_all(
            [
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="user",
                    lang="en",
                    content="Hello?",
                ),
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="assistant",
                    lang="en",
                    content="Hi there.",
                ),
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="user",
                    lang="ko",
                    content="안녕하세요?",
                ),
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=other_user_id,
                    role="assistant",
                    lang="en",
                    content="This should not leak.",
                ),
            ]
        )
        db.commit()

    login_user("viewer@example.com")
    response = client.get(f"/persona/{PERSONA_ID}/chat", params={"lang": "en"})

    assert response.status_code == 200
    payload = response.json()
    assert [message["role"] for message in payload["messages"]] == ["user", "assistant"]
    assert [message["content"] for message in payload["messages"]] == ["Hello?", "Hi there."]


def test_reset_chat_session_hides_older_history_from_reload(client, login_user):
    _seed_persona()
    viewer_user_id = _create_user("viewer@example.com")

    with SessionLocal() as db:
        db.add_all(
            [
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="user",
                    session_id=1,
                    lang="en",
                    content="First question",
                ),
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="assistant",
                    session_id=1,
                    lang="en",
                    content="First answer",
                ),
            ]
        )
        db.commit()

    login_user("viewer@example.com")
    reset_response = client.post(f"/persona/{PERSONA_ID}/chat/reset", params={"lang": "en"})
    assert reset_response.status_code == 200
    assert reset_response.json()["session_id"] == 2

    history_response = client.get(f"/persona/{PERSONA_ID}/chat", params={"lang": "en"})
    assert history_response.status_code == 200
    assert history_response.json()["messages"] == []

    with SessionLocal() as db:
        reset_marker = db.scalar(
            select(PersonaChatMessage).where(
                PersonaChatMessage.persona_id == PERSONA_ID,
                PersonaChatMessage.viewer_user_id == viewer_user_id,
                PersonaChatMessage.role == "system",
                PersonaChatMessage.session_id == 2,
            )
        )
    assert reset_marker is not None


def test_ask_persona_is_rate_limited_to_ten_questions_per_hour(client, login_user):
    _seed_persona()
    viewer_user_id = _create_user("viewer@example.com")
    recent_time = datetime.now(timezone.utc) - timedelta(minutes=10)

    with SessionLocal() as db:
        db.add_all(
            [
                PersonaChatMessage(
                    persona_id=PERSONA_ID,
                    viewer_user_id=viewer_user_id,
                    role="user",
                    session_id=1,
                    lang="en",
                    content=f"Question {index + 1}",
                    created_at=recent_time,
                )
                for index in range(10)
            ]
        )
        db.commit()

    login_user("viewer@example.com")
    response = client.post(
        f"/persona/{PERSONA_ID}/ask",
        json={"question": "Can I ask one more?", "lang": "en"},
    )

    assert response.status_code == 429
    assert response.json()["detail"] == "You can ask up to 10 questions per hour."
