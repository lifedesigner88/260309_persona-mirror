from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

import anthropic
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Persona, PersonaChatMessage
from .schemas import PersonaChatMessageResponse

CHAT_HISTORY_CONTEXT_LIMIT = 12
QUESTION_LIMIT_PER_HOUR = 10
CHAT_RESPONSE_LIMITS = {
    "ko": {"max_chars": 1200, "max_lines": 20, "max_tokens": 900},
    "en": {"max_chars": 1200, "max_lines": 20, "max_tokens": 900},
}
BASE_CONTEXT_KEYS = ("profile", "persona", "snapshot")
HUPOSITORY_FILE_LIMITS = {
    "profile": ("data/profile.yaml", 1600),
    "persona": ("data/01_identity/persona.yaml", 2400),
    "snapshot": ("data/08_now/snapshot.yaml", 2200),
    "technical": ("data/03_skills/technical.yaml", 1800),
    "goals": ("data/06_goals/lifetime.yaml", 1800),
    "matching": ("data/07_matching/signals.yaml", 1400),
    "readme": ("README.md", 1400),
}
KEYWORD_CONTEXT_RULES: tuple[tuple[tuple[str, ...], tuple[str, ...]], ...] = (
    (
        ("기술", "개발", "스택", "배포", "인프라", "백엔드", "프론트", "ai", "infra", "backend", "frontend", "fastapi", "langgraph"),
        ("technical",),
    ),
    (
        ("비전", "방향", "목표", "미션", "왜", "goal", "vision", "direction", "mission", "why"),
        ("goals",),
    ),
    (
        ("팀", "팀원", "협업", "같이", "fit", "team", "teammate", "collaboration", "partner"),
        ("matching",),
    ),
    (
        ("휴포지토리", "hupository", "repo", "repository", "data", "데이터"),
        ("readme",),
    ),
)


def _normalize_lang(lang: str) -> Literal["ko", "en"]:
    return "ko" if str(lang).startswith("ko") else "en"


def _trim_text(text: str, limit: int) -> str:
    cleaned = text.strip()
    if len(cleaned) <= limit:
        return cleaned
    trimmed = cleaned[:limit]
    newline_trimmed = trimmed.rsplit("\n", 1)[0].rstrip()
    if len(newline_trimmed) >= max(200, limit // 2):
        trimmed = newline_trimmed
    return f"{trimmed.rstrip()}\n..."


def _get_chat_response_limits(lang: Literal["ko", "en"]) -> dict[str, int]:
    return CHAT_RESPONSE_LIMITS[lang]


def _trim_line_for_chat(line: str, limit: int) -> str:
    cleaned = line.strip()
    if len(cleaned) <= limit:
        return cleaned
    if limit <= 1:
        return "…"

    candidate = cleaned[: max(1, limit - 1)].rstrip()
    cutoff_candidates = [candidate.rfind(marker) for marker in ("。", ".", "!", "?", "…", ",", " ", "·")]
    cutoff = max(cutoff_candidates)
    if cutoff >= max(12, limit // 2):
        candidate = candidate[:cutoff].rstrip(" ,;:")
    return f"{candidate.rstrip()}…"


def _shape_answer_for_chat(answer: str, lang: Literal["ko", "en"]) -> str:
    limits = _get_chat_response_limits(lang)
    max_chars = limits["max_chars"]
    max_lines = limits["max_lines"]
    lines = [line.strip() for line in answer.replace("\r\n", "\n").split("\n") if line.strip()]
    if not lines:
        return answer.strip()

    full_text = "\n".join(lines).strip()
    if len(full_text) <= max_chars and len(lines) <= max_lines:
        return full_text

    kept_lines: list[str] = []
    for line in lines:
        candidate = "\n".join([*kept_lines, line]).strip()
        if len(kept_lines) < max_lines and len(candidate) <= max_chars:
            kept_lines.append(line)
            continue

        remaining_chars = max_chars - len("\n".join(kept_lines)) - (1 if kept_lines else 0)
        if remaining_chars > 8 and len(kept_lines) < max_lines:
            kept_lines.append(_trim_line_for_chat(line, remaining_chars))
        break

    if not kept_lines:
        return _trim_line_for_chat(" ".join(lines), max_chars)

    shaped = "\n".join(kept_lines).strip()
    if shaped != full_text and not shaped.endswith("…"):
        if len(shaped) + 1 <= max_chars:
            shaped = f"{shaped}…"
        else:
            kept_lines[-1] = _trim_line_for_chat(kept_lines[-1], max(12, len(kept_lines[-1]) - 1))
            shaped = "\n".join(kept_lines).strip()
    return shaped


@lru_cache(maxsize=1)
def _repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


@lru_cache(maxsize=1)
def _resolve_hupository_root() -> Path | None:
    env_root = os.getenv("HUPOSITORY_ROOT")
    candidates = [
        Path(env_root) if env_root else None,
        _repo_root() / "hupository",
        _repo_root().parent / "hupository" / "hupository",
    ]
    for candidate in candidates:
        if candidate and candidate.exists():
            return candidate
    return None


@lru_cache(maxsize=16)
def _read_hupository_snippet(context_key: str) -> str:
    root = _resolve_hupository_root()
    if root is None:
        return ""
    relative_path, char_limit = HUPOSITORY_FILE_LIMITS[context_key]
    path = root / relative_path
    if not path.exists():
        return ""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return ""
    return f"### {relative_path}\n{_trim_text(text, char_limit)}"


def _select_hupository_context_keys(question: str) -> list[str]:
    keys = list(BASE_CONTEXT_KEYS)
    lowered = question.lower()
    for keywords, context_keys in KEYWORD_CONTEXT_RULES:
        if any(keyword in lowered for keyword in keywords):
            for context_key in context_keys:
                if context_key not in keys:
                    keys.append(context_key)
    return keys


def _build_hupository_context(question: str) -> str:
    snippets = [
        snippet
        for context_key in _select_hupository_context_keys(question)
        if (snippet := _read_hupository_snippet(context_key))
    ]
    return "\n\n".join(snippets)


def _format_creator_pr(persona_data: dict) -> str:
    creator_pr = persona_data.get("creator_pr") or {}
    if not creator_pr:
        return ""

    sections: list[str] = ["## Team-building PR"]
    role_summary = creator_pr.get("role_summary")
    event_note = creator_pr.get("event_note")
    if role_summary:
        sections.append(f"Strongest role: {role_summary}")
    if event_note:
        sections.append(f"Context: {event_note}")

    teammate_roles = creator_pr.get("teammate_roles") or []
    if teammate_roles:
        sections.append("Target teammate fit:")
        for role in teammate_roles:
            title = role.get("title", "").strip()
            summary = role.get("summary", "").strip()
            bullets = role.get("bullets") or []
            line = f"- {title}"
            if summary:
                line += f": {summary}"
            sections.append(line)
            sections.extend(f"  - {bullet}" for bullet in bullets if bullet)

    for label, key in (
        ("Project direction", "project"),
        ("Why now", "why_now"),
        ("Why me", "why_me"),
    ):
        section = creator_pr.get(key) or {}
        title = section.get("title", "").strip()
        summary = section.get("summary", "").strip()
        bullets = section.get("bullets") or []
        if title or summary or bullets:
            sections.append(f"{label}: {title}".rstrip(": "))
            if summary:
                sections.append(summary)
            sections.extend(f"- {bullet}" for bullet in bullets if bullet)

    return "\n".join(sections)


def _build_system_prompt(persona_data: dict, question: str, lang: Literal["ko", "en"]) -> str:
    name = persona_data.get("headline", "this person")
    archetype = persona_data.get("archetype", "")
    one_liner = persona_data.get("one_liner", "")
    values = persona_data.get("top3_values") or []
    strengths = persona_data.get("strengths") or []
    watchouts = persona_data.get("watchouts") or []
    mbti = (persona_data.get("mbti") or {}).get("type", "")
    goals = persona_data.get("goals_vision") or {}
    mission = goals.get("lifetime_mission", "")
    decade = goals.get("current_decade_mission", "")
    long_term = goals.get("long_term_vision", "")
    directions = goals.get("long_term_directions") or []
    sdgs = persona_data.get("sdg_alignment") or []
    tech_stack = persona_data.get("tech_stack") or []
    timeline = persona_data.get("identity_shifts") or []
    creator_pr = _format_creator_pr(persona_data)
    hubosity_context = _build_hupository_context(question)

    sections = [
        "You are an AI persona assistant built from the structured profile and Hupository references below.",
        "Answer as a plausible first-person response grounded in the data, while staying transparent if the user asks about certainty or source limits.",
        "",
        "## Identity",
        f"Archetype: {archetype}",
        f"Headline: {name}",
        f"MBTI: {mbti}",
        f"One-liner: {one_liner}",
    ]
    if values:
        sections.append(f"Core values: {', '.join(values)}")
    if strengths:
        sections.append("\n## Strengths\n" + "\n".join(f"- {strength}" for strength in strengths))
    if watchouts:
        sections.append("\n## Watch-outs\n" + "\n".join(f"- {watchout}" for watchout in watchouts))
    if mission or decade or long_term or directions:
        sections.append("\n## Goals & Vision")
        if mission:
            sections.append(f"Lifetime mission: {mission}")
        if decade:
            sections.append(f"Current decade mission: {decade}")
        if long_term:
            sections.append(f"Long-term vision: {long_term}")
        if directions:
            sections.append("Long-term directions: " + ", ".join(directions))
    if sdgs:
        sections.append(
            "\n## SDGs of interest\n"
            + "\n".join(
                f"- SDG {item.get('sdg')}: {item.get('label')} ({item.get('resonance')})"
                for item in sdgs
            )
        )
    if tech_stack:
        sections.append(
            "\n## Tech stack\n"
            + ", ".join(item.get("name", "") for item in tech_stack[:14] if item.get("name"))
        )
    if timeline:
        sections.append(
            "\n## Identity timeline\n"
            + "\n".join(
                f"- {item.get('period')}: {item.get('label')} — {item.get('note')}"
                for item in timeline[:4]
            )
        )
    if creator_pr:
        sections.append(f"\n{creator_pr}")
    if hubosity_context:
        sections.append(f"\n## Hupository references\n{hubosity_context}")

    answer_language = "Korean" if lang == "ko" else "English"
    response_limits = _get_chat_response_limits(lang)
    sections.append(
        "\n## Rules"
        f"\n- Answer in {answer_language}."
        "\n- Prefer concise, grounded answers unless the user asks for detail."
        "\n- Keep each answer compact enough for a chat bubble."
        f"\n- Stay within about {response_limits['max_lines']} short lines and roughly {response_limits['max_chars']} characters."
        "\n- Default to 3 to 5 short bullets or one short paragraph."
        "\n- If more detail would help, give the most important part first and invite a follow-up instead of dumping everything at once."
        "\n- Use the profile, creator PR, recent chat turns, and Hupository snippets as your main sources."
        "\n- If the data does not clearly support a claim, say you are not fully sure instead of inventing details."
        "\n- Keep the tone warm, collaborative, and builder-like."
        "\n- If asked about the system itself, explain that this is an AI-generated persona response based on recorded data."
    )
    return "\n".join(sections)


def _load_recent_chat_turns(
    db: Session,
    *,
    persona_id: str,
    viewer_user_id: int,
    lang: Literal["ko", "en"],
    session_id: int,
    limit: int = CHAT_HISTORY_CONTEXT_LIMIT,
) -> list[dict[str, str]]:
    stmt = (
        select(PersonaChatMessage)
        .where(
            PersonaChatMessage.persona_id == persona_id,
            PersonaChatMessage.viewer_user_id == viewer_user_id,
            PersonaChatMessage.lang == lang,
            PersonaChatMessage.session_id == session_id,
            PersonaChatMessage.role.in_(("user", "assistant")),
        )
        .order_by(PersonaChatMessage.created_at.desc(), PersonaChatMessage.message_id.desc())
        .limit(limit)
    )
    recent_messages = list(db.scalars(stmt).all())
    recent_messages.reverse()
    return [{"role": message.role, "content": message.content} for message in recent_messages]


def _to_chat_message_response(message: PersonaChatMessage) -> PersonaChatMessageResponse:
    return PersonaChatMessageResponse(
        message_id=message.message_id,
        role=message.role,  # type: ignore[arg-type]
        lang=message.lang,
        content=message.content,
        created_at=message.created_at,
    )


def _get_current_session_id(
    db: Session,
    *,
    persona_id: str,
    viewer_user_id: int,
    lang: Literal["ko", "en"],
) -> int:
    stmt = (
        select(PersonaChatMessage.session_id)
        .where(
            PersonaChatMessage.persona_id == persona_id,
            PersonaChatMessage.viewer_user_id == viewer_user_id,
            PersonaChatMessage.lang == lang,
        )
        .order_by(PersonaChatMessage.session_id.desc(), PersonaChatMessage.message_id.desc())
        .limit(1)
    )
    session_id = db.scalar(stmt)
    return session_id if session_id is not None else 1


def list_chat_messages(
    db: Session,
    *,
    persona_id: str,
    viewer_user_id: int,
    lang: Literal["ko", "en"],
) -> list[PersonaChatMessageResponse]:
    session_id = _get_current_session_id(
        db, persona_id=persona_id, viewer_user_id=viewer_user_id, lang=lang
    )
    stmt = (
        select(PersonaChatMessage)
        .where(
            PersonaChatMessage.persona_id == persona_id,
            PersonaChatMessage.viewer_user_id == viewer_user_id,
            PersonaChatMessage.lang == lang,
            PersonaChatMessage.session_id == session_id,
            PersonaChatMessage.role.in_(("user", "assistant")),
        )
        .order_by(PersonaChatMessage.created_at.asc(), PersonaChatMessage.message_id.asc())
    )
    return [_to_chat_message_response(message) for message in db.scalars(stmt).all()]


def reset_chat_session(
    db: Session,
    *,
    persona_id: str,
    viewer_user_id: int,
    lang: Literal["ko", "en"],
) -> int:
    next_session_id = _get_current_session_id(
        db, persona_id=persona_id, viewer_user_id=viewer_user_id, lang=lang
    ) + 1
    db.add(
        PersonaChatMessage(
            persona_id=persona_id,
            viewer_user_id=viewer_user_id,
            role="system",
            session_id=next_session_id,
            lang=lang,
            content="__session_reset__",
        )
    )
    db.commit()
    return next_session_id


def _fallback_answer(lang: Literal["ko", "en"]) -> str:
    if lang == "ko":
        return "지금은 답변을 길게 이어가기 어려워요. 잠시 후 다시 질문해 주세요."
    return "I can't keep the answer going properly right now. Please try again in a moment."


def _enforce_hourly_question_limit(db: Session, *, viewer_user_id: int) -> None:
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    question_count = db.scalar(
        select(func.count())
        .select_from(PersonaChatMessage)
        .where(
            PersonaChatMessage.viewer_user_id == viewer_user_id,
            PersonaChatMessage.role == "user",
            PersonaChatMessage.created_at >= window_start,
        )
    )
    if (question_count or 0) >= QUESTION_LIMIT_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You can ask up to {QUESTION_LIMIT_PER_HOUR} questions per hour.",
        )


def _request_model_answer(
    system: str, messages: list[dict[str, str]], *, lang: Literal["ko", "en"]
) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    client = anthropic.Anthropic(api_key=api_key)
    response_limits = _get_chat_response_limits(lang)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=response_limits["max_tokens"],
        system=system,
        messages=messages,
    )
    text_blocks = [block.text for block in response.content if getattr(block, "type", None) == "text"]
    answer = "".join(text_blocks).strip()
    if not answer:
        raise RuntimeError("Persona model returned an empty answer")
    return answer


def ask_persona(
    db: Session,
    *,
    persona: Persona,
    viewer_user_id: int,
    question: str,
    lang: str,
) -> str:
    normalized_lang = _normalize_lang(lang)
    _enforce_hourly_question_limit(db, viewer_user_id=viewer_user_id)
    persona_data = persona.data_kor if (normalized_lang == "ko" and persona.data_kor) else persona.data_eng
    system = _build_system_prompt(persona_data, question, normalized_lang)
    session_id = _get_current_session_id(
        db,
        persona_id=persona.persona_id,
        viewer_user_id=viewer_user_id,
        lang=normalized_lang,
    )
    history = _load_recent_chat_turns(
        db,
        persona_id=persona.persona_id,
        viewer_user_id=viewer_user_id,
        lang=normalized_lang,
        session_id=session_id,
    )

    question_message = PersonaChatMessage(
        persona_id=persona.persona_id,
        viewer_user_id=viewer_user_id,
        role="user",
        session_id=session_id,
        lang=normalized_lang,
        content=question,
    )
    db.add(question_message)

    try:
        answer = _request_model_answer(
            system,
            [*history, {"role": "user", "content": question}],
            lang=normalized_lang,
        )
    except Exception:  # noqa: BLE001
        answer = _fallback_answer(normalized_lang)
    answer = _shape_answer_for_chat(answer, normalized_lang)

    db.add(
        PersonaChatMessage(
            persona_id=persona.persona_id,
            viewer_user_id=viewer_user_id,
            role="assistant",
            session_id=session_id,
            lang=normalized_lang,
            content=answer,
        )
    )
    db.commit()
    return answer
