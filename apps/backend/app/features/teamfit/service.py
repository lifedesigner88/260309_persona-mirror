from __future__ import annotations

import hashlib
import json
import math
import os
import re
from collections.abc import Iterable
from datetime import datetime, timezone
from functools import lru_cache

import anthropic
from fastapi import HTTPException, status
from openai import OpenAI
from sqlalchemy import Select, func, inspect, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.features.auth.models import User

from .models import (
    TeamfitExplorerProfile,
    TeamfitExplorerTurn,
    TeamfitFitCheck,
    TeamfitProfile,
)
from .schemas import (
    TeamfitCandidateDirectoryItem,
    TeamfitCandidateDirectoryResponse,
    TeamfitConversationPriorityRecommendation,
    TeamfitExplorerMeResponse,
    TeamfitExtractedSignals,
    TeamfitFitCheckState,
    TeamfitFitCheckUpdate,
    TeamfitExplorerProfileResponse,
    TeamfitExplorerProfileSaveRequest,
    TeamfitFollowupAnswerRequest,
    TeamfitInterviewQuestionRequest,
    TeamfitInterviewQuestionResponse,
    TeamfitInterviewTurnInput,
    TeamfitInterviewTurnSaveInput,
    TeamfitInterviewTurnResponse,
    TeamfitMeResponse,
    TeamfitProfileResponse,
    TeamfitProfileUpsertRequest,
    TeamfitRecommendationReasonDetail,
    TeamfitRecommendationsResponse,
    TeamfitRecommendationSystemNotes,
    TeamfitRejectedCandidate,
    TeamfitSignalConfidence,
    TeamfitWorkStyleSignals,
)

VECTOR_DIMENSIONS = 1536
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
MAX_RECOMMENDATIONS_PER_BUCKET = 4
TOP_K_CANDIDATES = 50
PGVECTOR_EMBEDDING_READY_KEY = "teamfit_pgvector_embedding_ready"
MBTI_AXIS_IDS = ("mind", "energy", "nature", "tactics", "identity")
MBTI_AXIS_WEIGHTS = {
    "mind": 0.10,
    "energy": 0.30,
    "nature": 0.20,
    "tactics": 0.30,
    "identity": 0.10,
}
MBTI_AXIS_LETTERS = {
    "mind": ("I", "E"),
    "energy": ("N", "S"),
    "nature": ("F", "T"),
    "tactics": ("J", "P"),
    "identity": ("T", "A"),
}
DEFAULT_MBTI_LEFT_PERCENT = 74
DEFAULT_MBTI_RIGHT_PERCENT = 26
TEAMFIT_INTERVIEW_MODEL = os.getenv(
    "ANTHROPIC_TEAMFIT_MODEL", "claude-haiku-4-5-20251001"
)
TEAMFIT_EXTRACTION_MODEL = os.getenv(
    "ANTHROPIC_TEAMFIT_EXTRACTION_MODEL", TEAMFIT_INTERVIEW_MODEL
)
INITIAL_INTERVIEW_QUESTION_LIMIT = 3
EXTRACTION_VERSION = "conversation_priority_v2"
SAFE_FIT_THRESHOLD = 0.58
COMPLEMENTARY_THRESHOLD = 0.52
WILDCARD_THRESHOLD = 0.46
FALLBACK_RECOMMENDATION_CONFIDENCE_THRESHOLD = 0.35
FALLBACK_RECOMMENDATION_SCORE_THRESHOLD = 0.30
ROLE_KEYWORDS = {
    "pm_operator": ("pm", "product", "기획", "프로덕트", "운영", "operator"),
    "frontend": ("frontend", "front-end", "프론트", "ux", "ui"),
    "backend": ("backend", "back-end", "백엔드", "api", "infra", "server"),
    "ai": ("ai", "ml", "llm", "model", "machine learning", "인공지능"),
    "design": ("design", "designer", "디자인"),
    "data_research": ("data", "research", "analytics", "리서치", "데이터"),
    "fullstack": ("fullstack", "full-stack", "풀스택"),
    "operations": ("ops", "operation", "운영", "community"),
}
ROLE_COMPATIBILITY = {
    "pm_operator": {"frontend", "backend", "fullstack", "design", "ai"},
    "frontend": {"pm_operator", "backend", "fullstack", "design"},
    "backend": {"pm_operator", "frontend", "fullstack", "ai", "data_research"},
    "ai": {"backend", "data_research", "pm_operator", "fullstack"},
    "design": {"pm_operator", "frontend", "fullstack"},
    "data_research": {"ai", "backend", "pm_operator"},
    "fullstack": {"pm_operator", "frontend", "backend", "ai", "design"},
    "operations": {"pm_operator", "design", "frontend"},
}
SDG_FAMILIES = {
    "no_poverty": {"equity", "wellbeing"},
    "zero_hunger": {"equity", "wellbeing"},
    "good_health_well_being": {"wellbeing"},
    "quality_education": {"learning", "equity"},
    "gender_equality": {"equity"},
    "clean_water_sanitation": {"sustainability", "wellbeing"},
    "affordable_clean_energy": {"sustainability", "innovation"},
    "decent_work_economic_growth": {"economy", "equity"},
    "industry_innovation_infrastructure": {"innovation", "economy"},
    "reduced_inequalities": {"equity"},
    "sustainable_cities_communities": {"sustainability", "community"},
    "responsible_consumption_production": {"sustainability"},
    "climate_action": {"sustainability"},
    "life_below_water": {"sustainability"},
    "life_on_land": {"sustainability"},
    "peace_justice_strong_institutions": {"governance", "equity"},
    "partnerships_for_the_goals": {"governance", "community"},
}


@lru_cache(maxsize=1)
def _openai_client() -> OpenAI | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return OpenAI(api_key=api_key)


@lru_cache(maxsize=1)
def _anthropic_client() -> anthropic.Anthropic | None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    return anthropic.Anthropic(api_key=api_key)


def is_postgres_session(db: Session) -> bool:
    bind = db.get_bind()
    return bind is not None and bind.dialect.name == "postgresql"


def has_pgvector_embedding_column(db: Session) -> bool:
    cached = db.info.get(PGVECTOR_EMBEDDING_READY_KEY)
    if cached is not None:
        return bool(cached)

    if not is_postgres_session(db):
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = False
        return False

    ready = bool(
        db.scalar(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'teamfit_profiles'
                      AND column_name = 'embedding'
                      AND table_schema = ANY(current_schemas(false))
                )
                """
            )
        )
    )
    db.info[PGVECTOR_EMBEDDING_READY_KEY] = ready
    return ready


def ensure_teamfit_pgvector_schema(db: Session) -> None:
    if not is_postgres_session(db):
        return
    if has_pgvector_embedding_column(db):
        return

    try:
        # Avoid hanging the whole app if another session still has a read lock open.
        db.execute(text("SET LOCAL lock_timeout = '1000ms'"))
        db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        db.execute(
            text(
                f"""
                ALTER TABLE teamfit_profiles
                ADD COLUMN IF NOT EXISTS embedding vector({VECTOR_DIMENSIONS})
                """
            )
        )
        db.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS teamfit_profiles_embedding_hnsw
                ON teamfit_profiles
                USING hnsw (embedding vector_cosine_ops)
                """
            )
        )
        db.commit()
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = True
    except SQLAlchemyError:
        db.rollback()
        db.info[PGVECTOR_EMBEDDING_READY_KEY] = False


def ensure_teamfit_explorer_schema(db: Session) -> None:
    bind = db.get_bind()
    if bind is None:
        return

    extracted_at_type = (
        "TIMESTAMP WITH TIME ZONE" if bind.dialect.name == "postgresql" else "DATETIME"
    )

    with bind.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("teamfit_explorer_profiles"):
            return

        columns = {
            column["name"]
            for column in inspector.get_columns("teamfit_explorer_profiles")
        }
        if "extracted_signals_json" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE teamfit_explorer_profiles ADD COLUMN extracted_signals_json JSON"
                )
            )
        if "recommendation_embedding_input" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE teamfit_explorer_profiles ADD COLUMN recommendation_embedding_input TEXT"
                )
            )
        if "recommendation_embedding_json" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE teamfit_explorer_profiles ADD COLUMN recommendation_embedding_json JSON"
                )
            )
        if "extraction_version" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE teamfit_explorer_profiles ADD COLUMN extraction_version VARCHAR(48)"
                )
            )
        if "extracted_at" not in columns:
            connection.execute(
                text(
                    f"ALTER TABLE teamfit_explorer_profiles ADD COLUMN extracted_at {extracted_at_type}"
                )
            )


def _normalize_text(value: str, label: str, *, max_length: int = 160) -> str:
    normalized = " ".join(value.split()).strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 비어 있을 수 없습니다.",
        )
    return normalized[:max_length]


def _normalize_optional_text(value: str | None, *, max_length: int = 220) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.split()).strip()
    if not normalized:
        return None
    return normalized[:max_length]


def _normalize_markdown_text(value: str, label: str, *, max_length: int = 800) -> str:
    normalized = value.replace("\r\n", "\n").strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 비어 있을 수 없습니다.",
        )
    if len(normalized) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최대 {max_length}자까지 입력할 수 있습니다.",
        )
    return normalized


def _normalize_string_list(
    values: Iterable[str],
    label: str,
    *,
    min_items: int = 1,
    max_items: int = 8,
    max_item_length: int = 48,
) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in values:
        item = " ".join(str(raw).split()).strip()
        if not item:
            continue
        item = item[:max_item_length]
        lowered = item.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(item)
    if len(normalized) < min_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최소 {min_items}개 이상 입력해야 합니다.",
        )
    if len(normalized) > max_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label}은(는) 최대 {max_items}개까지 입력할 수 있습니다.",
        )
    return normalized


def _normalize_mbti(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().upper()
    if not normalized:
        return None
    if re.fullmatch(r"[IE][NS][FT][JP](?:-[AT])?", normalized) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI는 INFJ 또는 INFJ-T 형식이어야 합니다.",
        )
    return normalized


def _default_mbti_axis_values_from_mbti(value: str | None) -> dict[str, int] | None:
    normalized = _normalize_mbti(value)
    if normalized is None:
        return None

    compact = normalized.replace("-", "")
    axis_values: dict[str, int] = {}

    for index, axis_id in enumerate(MBTI_AXIS_IDS):
        letter = compact[index] if index < len(compact) else ""
        left_letter, right_letter = MBTI_AXIS_LETTERS[axis_id]
        if letter == left_letter:
            axis_values[axis_id] = DEFAULT_MBTI_LEFT_PERCENT
        elif letter == right_letter:
            axis_values[axis_id] = DEFAULT_MBTI_RIGHT_PERCENT
        else:
            axis_values[axis_id] = 50

    return axis_values


def _format_mbti_from_axis_values(values: dict[str, int]) -> str:
    letters: list[str] = []

    for axis_id in MBTI_AXIS_IDS:
        left_letter, right_letter = MBTI_AXIS_LETTERS[axis_id]
        axis_value = values.get(axis_id, 50)
        if axis_value > 50:
            letters.append(left_letter)
        elif axis_value < 50:
            letters.append(right_letter)
        else:
            return ""

    return f"{''.join(letters[:4])}-{letters[4]}"


def _normalize_mbti_axis_values(
    values: dict[str, int] | None,
    normalized_mbti: str | None,
) -> dict[str, int] | None:
    if values is None:
        return _default_mbti_axis_values_from_mbti(normalized_mbti)

    normalized: dict[str, int] = {}
    for axis_id in MBTI_AXIS_IDS:
        raw_value = values.get(axis_id)
        if raw_value is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI를 저장하려면 5개 축 값을 모두 보내야 합니다.",
            )
        try:
            axis_value = int(raw_value)
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI 축 비중은 0부터 100 사이 숫자여야 합니다.",
            ) from exc
        if axis_value < 0 or axis_value > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MBTI 축 비중은 0부터 100 사이 숫자여야 합니다.",
            )
        normalized[axis_id] = axis_value

    selected_axes_count = sum(
        1 for axis_value in normalized.values() if axis_value != 50
    )
    if selected_axes_count == 0:
        return None
    if selected_axes_count != len(MBTI_AXIS_IDS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI를 입력하려면 5개 축을 모두 선택해야 합니다.",
        )

    expected_mbti = _format_mbti_from_axis_values(normalized)
    if not expected_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI를 입력하려면 5개 축을 모두 선택해야 합니다.",
        )
    if normalized_mbti and normalized_mbti != expected_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 문자열과 MBTI 축 비중이 일치하지 않습니다.",
        )
    return normalized


def _normalize_impact_tags(values: Iterable[str]) -> list[str]:
    normalized = _normalize_string_list(values, "임팩트 태그", min_items=0, max_items=4)
    if normalized and len(normalized) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지속가능개발목표는 선택한다면 4개를 모두 골라야 합니다.",
        )
    return normalized


def _normalize_sdg_tags(values: Iterable[str]) -> list[str]:
    normalized = _normalize_string_list(
        values,
        "지속가능개발목표",
        min_items=4,
        max_items=4,
        max_item_length=64,
    )
    if len(normalized) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지속가능개발목표는 4개를 모두 선택해야 합니다.",
        )
    return normalized


def _normalize_interview_turns(
    turns: list[TeamfitInterviewTurnInput],
    *,
    expected_count: int | None = None,
) -> list[TeamfitInterviewTurnInput]:
    normalized_turns: list[TeamfitInterviewTurnInput] = []
    for turn in turns:
        normalized_turns.append(
            TeamfitInterviewTurnInput(
                question=_normalize_text(turn.question, "질문", max_length=500),
                answer=_normalize_markdown_text(turn.answer, "답변", max_length=2000),
            )
        )

    if expected_count is not None and len(normalized_turns) != expected_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 답변은 정확히 {expected_count}개여야 합니다.",
        )

    return normalized_turns


def _normalize_interview_turns_for_save(
    turns: list[TeamfitInterviewTurnSaveInput],
) -> list[TeamfitInterviewTurnSaveInput]:
    normalized_turns: list[TeamfitInterviewTurnSaveInput] = []
    for index, turn in enumerate(turns, start=1):
        phase = turn.phase or (
            "initial" if index <= INITIAL_INTERVIEW_QUESTION_LIMIT else "followup"
        )
        normalized_turns.append(
            TeamfitInterviewTurnSaveInput(
                question=_normalize_text(turn.question, "질문", max_length=500),
                answer=_normalize_markdown_text(turn.answer, "답변", max_length=2000),
                phase=phase,
            )
        )

    if any(
        turn.phase != "initial"
        for turn in normalized_turns[:INITIAL_INTERVIEW_QUESTION_LIMIT]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"처음 {INITIAL_INTERVIEW_QUESTION_LIMIT}개 문답은 초기 인터뷰여야 합니다.",
        )

    if any(
        turn.phase != "followup"
        for turn in normalized_turns[INITIAL_INTERVIEW_QUESTION_LIMIT:]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초기 인터뷰 이후 문답은 추가 질문으로 저장되어야 합니다.",
        )

    return normalized_turns


def _build_embedding_input(payload: TeamfitProfileUpsertRequest) -> str:
    def humanize(values: Iterable[str]) -> list[str]:
        return [value.replace("_", " ") for value in values]

    sections = [
        ("Interests", humanize(payload.interests)),
        ("Problems", humanize(payload.problem_focus)),
        ("Domains", humanize(payload.domains)),
        ("Working style", humanize([payload.working_style])),
        ("Commitment pace", humanize([payload.commitment_pace])),
        ("Impact tags", humanize(payload.impact_tags)),
    ]
    if payload.one_liner:
        sections.append(("Intro", [payload.one_liner]))
    return "\n".join(
        f"{label}: {', '.join(values)}" for label, values in sections if values
    )


def _deterministic_embedding(text_value: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    tokens = re.findall(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_+-]*", text_value.lower())
    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for offset in range(0, 24, 3):
            index = (
                int.from_bytes(digest[offset : offset + 2], "big") % VECTOR_DIMENSIONS
            )
            sign = 1.0 if digest[offset + 2] % 2 == 0 else -1.0
            weight = 1.0 + (digest[offset + 2] / 255.0) * 0.25
            vector[index] += sign * weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def embed_text(
    text_value: str,
    *,
    allow_fallback_on_error: bool = False,
    prefer_remote: bool = True,
) -> list[float]:
    if not prefer_remote:
        return _deterministic_embedding(text_value)

    client = _openai_client()
    if client is None:
        return _deterministic_embedding(text_value)

    try:
        response = client.embeddings.create(
            model=OPENAI_EMBEDDING_MODEL,
            input=text_value,
            dimensions=VECTOR_DIMENSIONS,
        )
    except Exception as exc:  # noqa: BLE001
        if allow_fallback_on_error:
            return _deterministic_embedding(text_value)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="임베딩 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ) from exc

    return [float(value) for value in response.data[0].embedding]


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def sync_pgvector_embedding(db: Session, user_id: int, values: list[float]) -> None:
    if not is_postgres_session(db) or not has_pgvector_embedding_column(db):
        return
    db.execute(
        text(
            """
            UPDATE teamfit_profiles
            SET embedding = CAST(:embedding AS vector)
            WHERE user_id = :user_id
            """
        ),
        {"embedding": _vector_literal(values), "user_id": user_id},
    )


def _normalize_required_mbti(
    mbti: str | None,
    mbti_axis_values: dict[str, int] | None,
) -> tuple[str, dict[str, int]]:
    normalized_mbti = _normalize_mbti(mbti)
    normalized_axis_values = _normalize_mbti_axis_values(
        mbti_axis_values, normalized_mbti
    )
    if normalized_axis_values is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 5개 축을 모두 선택해야 합니다.",
        )

    resolved_mbti = normalized_mbti or _format_mbti_from_axis_values(
        normalized_axis_values
    )
    if not resolved_mbti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MBTI 문자열을 만들 수 없습니다.",
        )

    return resolved_mbti, normalized_axis_values


def _normalize_explorer_payload(
    problem_statement: str,
    mbti: str | None,
    mbti_axis_values: dict[str, int] | None,
    sdg_tags: Iterable[str],
    narrative_markdown: str,
) -> tuple[str, str, dict[str, int], list[str], str]:
    resolved_mbti, normalized_axis_values = _normalize_required_mbti(
        mbti, mbti_axis_values
    )
    return (
        _normalize_text(problem_statement, "풀고 싶은 문제", max_length=80),
        resolved_mbti,
        normalized_axis_values,
        _normalize_sdg_tags(sdg_tags),
        _normalize_markdown_text(narrative_markdown, "2단계 본문", max_length=800),
    )


def _markdown_sections(markdown: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current_key: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        if current_key is None:
            return
        value = "\n".join(line.rstrip() for line in current_lines).strip()
        if value:
            sections[current_key] = value

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        if line.startswith("## "):
            flush()
            current_key = line[3:].strip().casefold()
            current_lines = []
            continue
        if current_key is not None:
            current_lines.append(raw_line)

    flush()
    return sections


def _section_value(markdown: str, *labels: str) -> str:
    sections = _markdown_sections(markdown)
    for label in labels:
        value = sections.get(label.casefold())
        if value:
            return value
    return ""


def _split_sentences(text_value: str) -> list[str]:
    collapsed = re.sub(r"\s+", " ", text_value.replace("\r\n", "\n")).strip()
    if not collapsed:
        return []
    chunks = re.split(r"(?<=[.!?。！？])\s+|\n+", collapsed)
    return [chunk.strip(" -") for chunk in chunks if chunk.strip(" -")]


def _limit_unique(values: Iterable[str], *, max_items: int) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = " ".join(str(value).split()).strip()
        if not cleaned:
            continue
        lowered = cleaned.casefold()
        if lowered in seen:
            continue
        seen.add(lowered)
        result.append(cleaned)
        if len(result) >= max_items:
            break
    return result


def _keyword_tokens(text_value: str) -> list[str]:
    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "then",
        "have",
        "want",
        "will",
        "하는",
        "하고",
        "지금",
        "문제",
        "프로젝트",
        "사람",
        "팀",
        "같이",
        "먼저",
        "정말",
        "그냥",
        "대한",
        "에서",
        "으로",
        "하기",
    }
    tokens = re.findall(r"[0-9A-Za-z가-힣][0-9A-Za-z가-힣_-]{1,}", text_value.lower())
    return [token for token in tokens if token not in stopwords]


def _extract_theme_tokens(*parts: str, max_items: int = 6) -> list[str]:
    counts: dict[str, int] = {}
    for part in parts:
        for token in _keyword_tokens(part):
            counts[token] = counts.get(token, 0) + 1
    sorted_tokens = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [token.replace("_", " ") for token, _ in sorted_tokens[:max_items]]


def _infer_role(text_value: str) -> str:
    lowered = text_value.casefold()
    best_role = ""
    best_score = 0
    for role, keywords in ROLE_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in lowered)
        if score > best_score:
            best_role = role
            best_score = score
    return best_role


def _extract_work_style(text_value: str) -> TeamfitWorkStyleSignals:
    lowered = text_value.casefold()

    planning_style = "adaptive_planning"
    if any(
        keyword in lowered
        for keyword in ("문서", "documentation", "structured", "구조")
    ):
        planning_style = "structured_planning"
    elif any(keyword in lowered for keyword in ("research", "리서치", "조사")):
        planning_style = "research_first"

    communication_style = "direct_sync"
    if any(keyword in lowered for keyword in ("async", "비동기", "문서로", "글로")):
        communication_style = "async_first"
    elif any(keyword in lowered for keyword in ("대화", "talk", "sync", "회의")):
        communication_style = "sync_conversation"

    decision_style = "bias_for_action"
    if any(keyword in lowered for keyword in ("합의", "consensus", "함께 결정")):
        decision_style = "consensus_then_commit"
    elif any(keyword in lowered for keyword in ("데이터", "실험", "evidence", "근거")):
        decision_style = "evidence_driven"

    execution_speed = "steady_execution"
    if any(
        keyword in lowered for keyword in ("빠르게", "fast", "speed", "신속", "즉시")
    ):
        execution_speed = "fast_iteration"
    elif any(keyword in lowered for keyword in ("깊게", "deep", "차분", "steady")):
        execution_speed = "deep_and_steady"

    return TeamfitWorkStyleSignals(
        planning_style=planning_style,
        communication_style=communication_style,
        decision_style=decision_style,
        execution_speed=execution_speed,
    )


def _build_enriched_markdown(
    problem_statement: str,
    narrative_markdown: str,
    turns: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
) -> str:
    sections = [
        f"# Problem statement\n{problem_statement}",
        f"# Narrative\n{narrative_markdown.strip()}",
    ]
    if turns:
        transcript_lines: list[str] = ["# Interview transcript"]
        for turn in turns:
            transcript_lines.append(f"Q: {turn.question}")
            transcript_lines.append(f"A: {turn.answer}")
        sections.append("\n".join(transcript_lines))
    return "\n\n".join(section for section in sections if section.strip())


def _fallback_extract_signals(
    *,
    problem_statement: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    turns: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
) -> TeamfitExtractedSignals:
    why_now = _section_value(
        narrative_markdown,
        "왜 이 문제를 풀고 싶나",
        "why do i want to solve this problem?",
    )
    role_section = _section_value(
        narrative_markdown,
        "내가 팀에서 맡고 싶은 역할",
        "what role do i want to take in the team?",
    )
    strengths_section = _section_value(
        narrative_markdown,
        "내가 줄 수 있는 것",
        "what can i contribute?",
    )
    teammate_section = _section_value(
        narrative_markdown,
        "같이 대화해보고 싶은 사람",
        "who do i want to talk with first?",
    )
    collaboration_section = _section_value(
        narrative_markdown,
        "잘 맞는 협업 / 피하고 싶은 협업",
        "what collaboration fits me / what do i want to avoid?",
    )

    history_answers = [turn.answer for turn in turns if turn.answer]
    why_this_problem_now = why_now or (history_answers[0] if history_answers else "")
    offered_role = _infer_role(role_section or strengths_section)
    wanted_teammate_role = _infer_role(teammate_section)
    work_style_source = "\n".join(
        part for part in [collaboration_section, *history_answers] if part
    )
    work_style = _extract_work_style(work_style_source)

    core_strengths = _limit_unique(
        _split_sentences(strengths_section)
        + _extract_theme_tokens(strengths_section, max_items=4),
        max_items=4,
    )
    must_have_signals = _limit_unique(_split_sentences(teammate_section), max_items=4)
    avoid_signals = _limit_unique(
        [
            sentence
            for sentence in _split_sentences(collaboration_section)
            if any(
                keyword in sentence.casefold()
                for keyword in ("피하", "싫", "avoid", "not", "갈등")
            )
        ],
        max_items=4,
    )
    conversation_hooks = _limit_unique(
        [
            *[problem_statement],
            *(_split_sentences(why_this_problem_now)[:2]),
            *(_split_sentences(strengths_section)[:2]),
            *(history_answers[:2]),
        ],
        max_items=4,
    )
    tension_points = _limit_unique(
        [
            *avoid_signals,
            *[
                sentence
                for sentence in _split_sentences("\n".join(history_answers))
                if any(
                    keyword in sentence.casefold()
                    for keyword in ("보완", "부족", "uncertain", "확인", "걱정")
                )
            ],
        ],
        max_items=4,
    )
    problem_themes = _extract_theme_tokens(
        problem_statement, why_this_problem_now, narrative_markdown, max_items=6
    )
    value_themes = _limit_unique(
        [family for sdg in sdg_tags for family in SDG_FAMILIES.get(sdg, set())],
        max_items=6,
    )

    presence_scores = [
        1.0 if problem_statement else 0.0,
        1.0 if why_this_problem_now else 0.0,
        1.0 if offered_role else 0.0,
        1.0 if must_have_signals else 0.0,
        1.0 if conversation_hooks else 0.0,
    ]
    profile_clarity_score = round(
        min(
            1.0,
            sum(presence_scores) / len(presence_scores) + len(history_answers) * 0.05,
        ),
        3,
    )

    signals = TeamfitExtractedSignals(
        problem_statement=problem_statement,
        problem_themes=problem_themes,
        why_this_problem_now=why_this_problem_now,
        offered_role=offered_role,
        wanted_teammate_role=wanted_teammate_role,
        core_strengths=core_strengths,
        value_themes=value_themes,
        work_style=work_style,
        must_have_signals=must_have_signals,
        avoid_signals=avoid_signals,
        sdgs=list(sdg_tags),
        conversation_hooks=conversation_hooks,
        tension_points=tension_points,
        profile_clarity_score=profile_clarity_score,
        signal_confidence=TeamfitSignalConfidence(
            problem_statement=1.0 if problem_statement else 0.0,
            role=0.85 if offered_role else 0.3,
            work_style=0.75 if work_style_source else 0.25,
        ),
    )
    signals.summary_for_embedding = " | ".join(
        part
        for part in [
            signals.problem_statement,
            signals.why_this_problem_now,
            signals.offered_role,
            signals.wanted_teammate_role,
            ", ".join(signals.problem_themes[:4]),
            ", ".join(signals.core_strengths[:3]),
            ", ".join(signals.must_have_signals[:3]),
            ", ".join(signals.sdgs),
            ", ".join(signals.conversation_hooks[:2]),
        ]
        if part
    )
    return signals


def _strip_code_fences(text_value: str) -> str:
    stripped = text_value.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    return stripped


def _extract_signals_with_llm(
    *,
    problem_statement: str,
    mbti: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    turns: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
) -> TeamfitExtractedSignals:
    client = _anthropic_client()
    if client is None:
        return _fallback_extract_signals(
            problem_statement=problem_statement,
            sdg_tags=sdg_tags,
            narrative_markdown=narrative_markdown,
            turns=turns,
        )

    prompt = f"""
You extract structured signals for a conversation-priority team recommendation system.

Rules:
- Output valid JSON only.
- Be conservative. Do not invent facts.
- Empty string or empty array is better than overclaiming.
- Keep values concise and interpretable.
- signal_confidence fields must be numbers between 0 and 1.
- work_style fields should be short snake_case style labels when possible.
- offered_role and wanted_teammate_role should be short labels, not long paragraphs.

Return this schema exactly:
{{
  "problem_statement": "",
  "problem_themes": [],
  "why_this_problem_now": "",
  "offered_role": "",
  "wanted_teammate_role": "",
  "core_strengths": [],
  "value_themes": [],
  "work_style": {{
    "planning_style": "",
    "communication_style": "",
    "decision_style": "",
    "execution_speed": ""
  }},
  "must_have_signals": [],
  "avoid_signals": [],
  "sdgs": [],
  "conversation_hooks": [],
  "tension_points": [],
  "profile_clarity_score": 0.0,
  "signal_confidence": {{
    "problem_statement": 0.0,
    "role": 0.0,
    "work_style": 0.0
  }},
  "summary_for_embedding": ""
}}

Problem statement: {problem_statement}
MBTI: {mbti}
SDGs: {", ".join(sdg_tags)}

Narrative:
{narrative_markdown}

Interview:
{_build_enriched_markdown(problem_statement, narrative_markdown, turns)}
""".strip()

    try:
        response = client.messages.create(
            model=TEAMFIT_EXTRACTION_MODEL,
            max_tokens=1400,
            system="Extract structured team-fit recommendation signals. Output JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
        payload = json.loads(_strip_code_fences(response.content[0].text))
        signals = TeamfitExtractedSignals.model_validate(payload)
        if not signals.summary_for_embedding:
            signals.summary_for_embedding = " | ".join(
                part
                for part in [
                    signals.problem_statement,
                    signals.why_this_problem_now,
                    signals.offered_role,
                    signals.wanted_teammate_role,
                    ", ".join(signals.problem_themes[:4]),
                    ", ".join(signals.conversation_hooks[:2]),
                ]
                if part
            )
        return signals
    except Exception:  # noqa: BLE001
        return _fallback_extract_signals(
            problem_statement=problem_statement,
            sdg_tags=sdg_tags,
            narrative_markdown=narrative_markdown,
            turns=turns,
        )


def _sync_explorer_profile_artifacts(
    profile: TeamfitExplorerProfile,
    turns: list[TeamfitExplorerTurn],
) -> None:
    signals = _extract_signals_with_llm(
        problem_statement=profile.problem_statement,
        mbti=profile.mbti,
        sdg_tags=list(profile.sdg_tags or []),
        narrative_markdown=profile.narrative_markdown,
        turns=turns,
    )
    embedding_input = signals.summary_for_embedding or _build_enriched_markdown(
        profile.problem_statement,
        profile.narrative_markdown,
        turns,
    )
    profile.extracted_signals_json = signals.model_dump(mode="python")
    profile.recommendation_embedding_input = embedding_input
    profile.recommendation_embedding_json = embed_text(
        embedding_input, allow_fallback_on_error=True
    )
    profile.extraction_version = EXTRACTION_VERSION
    profile.extracted_at = datetime.now(timezone.utc)


def _teamfit_interview_prompt(
    *,
    problem_statement: str,
    mbti: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    history_lines: list[str] = []
    for index, turn in enumerate(history, start=1):
        history_lines.append(f"Q{index}: {turn.question}")
        history_lines.append(f"A{index}: {turn.answer}")

    phase_label = (
        "initial 3-question interview" if phase == "initial" else "follow-up extension"
    )
    history_block = (
        "\n".join(history_lines) if history_lines else "No prior interview turns yet."
    )

    return f"""
You are an interviewer helping a user build a team-fit exploration profile.

Your job:
- Ask exactly one next question in Korean.
- The question should help clarify collaboration fit, motivation, decision criteria, or what kind of teammate would make this problem easier to solve.
- Avoid repeating prior questions.
- Keep it warm, specific, and concise.
- Output only the question itself. No bullets, no numbering, no preface.

Current phase: {phase_label}
Problem statement: {problem_statement}
MBTI: {mbti}
SDGs: {", ".join(sdg_tags)}
Narrative:
{narrative_markdown}

Prior interview:
{history_block}
""".strip()


def _fallback_teamfit_question(
    *,
    problem_statement: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    asked_questions = {
        turn.question.casefold().strip() for turn in history if turn.question
    }
    initial_candidates = [
        "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
        "함께할 팀원을 고를 때 꼭 맞아야 하는 협업 장면이나 역할 조합은 무엇인가요?",
        "6개월 뒤 이 문제를 잘 풀었다고 느끼게 해줄 가장 구체적인 결과는 무엇인가요?",
    ]
    followup_candidates = [
        "이 문제를 같이 풀 사람에게 꼭 기대하는 태도나 습관이 있다면 무엇인가요?",
        "대화를 먼저 시작할 사람을 고를 때, 가장 빨리 확인하고 싶은 신호는 무엇인가요?",
        f"`{problem_statement}`를 붙잡고 갈 때 내가 특히 보완받고 싶은 지점은 무엇인가요?",
    ]

    candidates = initial_candidates if phase == "initial" else followup_candidates
    for question in candidates:
        if question.casefold() not in asked_questions:
            return question

    return "이 문제를 함께 풀 사람과 실제로 대화해보면 가장 먼저 확인하고 싶은 기준은 무엇인가요?"


def _finalize_generated_teamfit_question(
    question: str, *, fallback_question: str
) -> str:
    cleaned = " ".join(question.split()).strip().strip("`\"'“”‘’")
    if not cleaned:
        return fallback_question
    if cleaned.endswith(("?", "？")):
        return cleaned

    normalized = cleaned.rstrip(".!。！")
    if normalized.endswith(("요", "죠", "까", "지")):
        return f"{normalized}?"

    return fallback_question


def _generate_teamfit_question(
    *,
    problem_statement: str,
    mbti: str,
    sdg_tags: list[str],
    narrative_markdown: str,
    history: list[TeamfitInterviewTurnInput] | list[TeamfitExplorerTurn],
    phase: str,
) -> str:
    fallback_question = _fallback_teamfit_question(
        problem_statement=problem_statement,
        history=history,
        phase=phase,
    )
    client = _anthropic_client()
    if client is None:
        return fallback_question

    try:
        response = client.messages.create(
            model=TEAMFIT_INTERVIEW_MODEL,
            max_tokens=220,
            system="Ask exactly one Korean question for a team-fit interview. Output only the question.",
            messages=[
                {
                    "role": "user",
                    "content": _teamfit_interview_prompt(
                        problem_statement=problem_statement,
                        mbti=mbti,
                        sdg_tags=sdg_tags,
                        narrative_markdown=narrative_markdown,
                        history=history,
                        phase=phase,
                    ),
                }
            ],
        )
        question = response.content[0].text.strip()
        if getattr(response, "stop_reason", None) == "max_tokens":
            question = fallback_question
    except Exception:  # noqa: BLE001
        question = fallback_question

    return _normalize_text(
        _finalize_generated_teamfit_question(
            question, fallback_question=fallback_question
        ),
        "추가 질문",
        max_length=500,
    )


def _active_explorer_profile_count_query() -> Select[tuple[int]]:
    return select(func.count()).select_from(TeamfitExplorerProfile)


def _load_explorer_turns(db: Session, user_id: int) -> list[TeamfitExplorerTurn]:
    return list(
        db.scalars(
            select(TeamfitExplorerTurn)
            .where(TeamfitExplorerTurn.user_id == user_id)
            .order_by(
                TeamfitExplorerTurn.sequence_no.asc(), TeamfitExplorerTurn.id.asc()
            )
        ).all()
    )


def _explorer_turn_to_response(
    turn: TeamfitExplorerTurn,
) -> TeamfitInterviewTurnResponse:
    return TeamfitInterviewTurnResponse(
        id=turn.id,
        sequence_no=turn.sequence_no,
        phase=turn.phase,
        question=turn.question,
        answer=turn.answer,
        created_at=turn.created_at,
    )


def _explorer_profile_to_response(
    profile: TeamfitExplorerProfile,
    turns: list[TeamfitExplorerTurn],
) -> TeamfitExplorerProfileResponse:
    return TeamfitExplorerProfileResponse(
        user_id=profile.user_id,
        problem_statement=profile.problem_statement,
        mbti=profile.mbti,
        mbti_axis_values=profile.mbti_axis_values,
        sdg_tags=list(profile.sdg_tags or []),
        narrative_markdown=profile.narrative_markdown,
        history=[_explorer_turn_to_response(turn) for turn in turns],
        can_request_followup=True,
        updated_at=profile.updated_at,
    )


def get_my_teamfit_explorer_profile(
    current_user: User, db: Session
) -> TeamfitExplorerMeResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    turns = _load_explorer_turns(db, current_user.user_id) if profile else []
    active_profile_count = int(db.scalar(_active_explorer_profile_count_query()) or 0)
    return TeamfitExplorerMeResponse(
        profile=_explorer_profile_to_response(profile, turns) if profile else None,
        active_profile_count=active_profile_count,
    )


def get_next_teamfit_interview_question(
    payload: TeamfitInterviewQuestionRequest,
) -> TeamfitInterviewQuestionResponse:
    problem_statement, resolved_mbti, _, sdg_tags, narrative_markdown = (
        _normalize_explorer_payload(
            payload.problem_statement,
            payload.mbti,
            payload.mbti_axis_values,
            payload.sdg_tags,
            payload.narrative_markdown,
        )
    )
    normalized_history = _normalize_interview_turns(payload.history)

    if len(normalized_history) >= INITIAL_INTERVIEW_QUESTION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 질문은 최대 {INITIAL_INTERVIEW_QUESTION_LIMIT}개까지입니다.",
        )

    question = _generate_teamfit_question(
        problem_statement=problem_statement,
        mbti=resolved_mbti,
        sdg_tags=sdg_tags,
        narrative_markdown=narrative_markdown,
        history=normalized_history,
        phase="initial",
    )

    return TeamfitInterviewQuestionResponse(
        phase="initial",
        sequence_no=len(normalized_history) + 1,
        question=question,
    )


def save_teamfit_explorer_profile(
    payload: TeamfitExplorerProfileSaveRequest,
    current_user: User,
    db: Session,
) -> TeamfitExplorerProfileResponse:
    (
        problem_statement,
        resolved_mbti,
        normalized_axis_values,
        sdg_tags,
        narrative_markdown,
    ) = _normalize_explorer_payload(
        payload.problem_statement,
        payload.mbti,
        payload.mbti_axis_values,
        payload.sdg_tags,
        payload.narrative_markdown,
    )
    normalized_history = _normalize_interview_turns_for_save(payload.history)

    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None and len(normalized_history) != INITIAL_INTERVIEW_QUESTION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 답변은 정확히 {INITIAL_INTERVIEW_QUESTION_LIMIT}개여야 합니다.",
        )
    if (
        profile is not None
        and len(normalized_history) < INITIAL_INTERVIEW_QUESTION_LIMIT
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"초기 인터뷰 답변은 최소 {INITIAL_INTERVIEW_QUESTION_LIMIT}개가 필요합니다.",
        )

    if profile is None:
        profile = TeamfitExplorerProfile(user_id=current_user.user_id)
        db.add(profile)

    profile.problem_statement = problem_statement
    profile.mbti = resolved_mbti
    profile.mbti_axis_values = normalized_axis_values
    profile.sdg_tags = sdg_tags
    profile.narrative_markdown = narrative_markdown

    for turn in _load_explorer_turns(db, current_user.user_id):
        db.delete(turn)

    db.flush()

    for index, turn in enumerate(normalized_history, start=1):
        db.add(
            TeamfitExplorerTurn(
                user_id=current_user.user_id,
                sequence_no=index,
                phase=turn.phase,
                question=turn.question,
                answer=turn.answer,
            )
        )

    db.flush()
    turns = _load_explorer_turns(db, current_user.user_id)
    _sync_explorer_profile_artifacts(profile, turns)
    db.commit()
    db.refresh(profile)
    return _explorer_profile_to_response(profile, turns)


def delete_teamfit_explorer_turn(
    turn_id: int,
    current_user: User,
    db: Session,
) -> TeamfitExplorerProfileResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="저장된 팀핏 프로필이 없습니다.",
        )

    turns = _load_explorer_turns(db, current_user.user_id)
    if len(turns) <= INITIAL_INTERVIEW_QUESTION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"인터뷰 기록은 최소 {INITIAL_INTERVIEW_QUESTION_LIMIT}개를 유지해야 합니다.",
        )

    target_turn = next((turn for turn in turns if turn.id == turn_id), None)
    if target_turn is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 인터뷰 기록을 찾지 못했습니다.",
        )

    db.delete(target_turn)
    db.flush()

    remaining_turns = _load_explorer_turns(db, current_user.user_id)
    if len(remaining_turns) < INITIAL_INTERVIEW_QUESTION_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"인터뷰 기록은 최소 {INITIAL_INTERVIEW_QUESTION_LIMIT}개를 유지해야 합니다.",
        )

    for index, turn in enumerate(remaining_turns, start=1):
        turn.sequence_no = index
        turn.phase = (
            "initial" if index <= INITIAL_INTERVIEW_QUESTION_LIMIT else "followup"
        )

    db.flush()
    _sync_explorer_profile_artifacts(profile, remaining_turns)
    db.commit()
    db.refresh(profile)
    return _explorer_profile_to_response(profile, remaining_turns)


def create_teamfit_followup_question(
    current_user: User,
    db: Session,
) -> TeamfitInterviewQuestionResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="저장된 팀핏 탐색 프로필이 없습니다.",
        )

    turns = _load_explorer_turns(db, current_user.user_id)
    question = _generate_teamfit_question(
        problem_statement=profile.problem_statement,
        mbti=profile.mbti,
        sdg_tags=list(profile.sdg_tags or []),
        narrative_markdown=profile.narrative_markdown,
        history=turns,
        phase="followup",
    )
    return TeamfitInterviewQuestionResponse(
        phase="followup",
        sequence_no=len(turns) + 1,
        question=question,
    )


def save_teamfit_followup_answer(
    payload: TeamfitFollowupAnswerRequest,
    current_user: User,
    db: Session,
) -> TeamfitExplorerProfileResponse:
    profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="저장된 팀핏 탐색 프로필이 없습니다.",
        )

    question = _normalize_text(payload.question, "추가 질문", max_length=500)
    answer = _normalize_markdown_text(payload.answer, "추가 답변", max_length=2000)
    turns = _load_explorer_turns(db, current_user.user_id)

    db.add(
        TeamfitExplorerTurn(
            user_id=current_user.user_id,
            sequence_no=len(turns) + 1,
            phase="followup",
            question=question,
            answer=answer,
        )
    )
    db.flush()
    turns = _load_explorer_turns(db, current_user.user_id)
    _sync_explorer_profile_artifacts(profile, turns)
    db.commit()
    db.refresh(profile)

    return _explorer_profile_to_response(profile, turns)


def _active_profile_count_query() -> Select[tuple[int]]:
    return (
        select(func.count())
        .select_from(TeamfitProfile)
        .where(TeamfitProfile.status == "active")
    )


def _profile_to_response(profile: TeamfitProfile) -> TeamfitProfileResponse:
    return TeamfitProfileResponse(
        user_id=profile.user_id,
        status=profile.status,
        completion_stage=profile.completion_stage,
        preferred_role=profile.preferred_role,
        working_style=profile.working_style,
        commitment_pace=profile.commitment_pace,
        interests=list(profile.interests or []),
        problem_focus=list(profile.problem_focus or []),
        domains=list(profile.domains or []),
        tech_stack=list(profile.tech_stack or []),
        impact_tags=list(profile.impact_tags or []),
        mbti=profile.mbti,
        mbti_axis_values=profile.mbti_axis_values
        or _default_mbti_axis_values_from_mbti(profile.mbti),
        one_liner=profile.one_liner,
        updated_at=profile.updated_at,
    )


def get_my_teamfit_profile(current_user: User, db: Session) -> TeamfitMeResponse:
    profile = db.get(TeamfitProfile, current_user.user_id)
    active_profile_count = int(db.scalar(_active_profile_count_query()) or 0)
    return TeamfitMeResponse(
        profile=_profile_to_response(profile) if profile else None,
        active_profile_count=active_profile_count,
    )


def upsert_teamfit_profile(
    payload: TeamfitProfileUpsertRequest,
    current_user: User,
    db: Session,
) -> TeamfitProfileResponse:
    normalized_mbti = _normalize_mbti(payload.mbti)
    normalized_mbti_axis_values = _normalize_mbti_axis_values(
        payload.mbti_axis_values, normalized_mbti
    )

    normalized_payload = TeamfitProfileUpsertRequest(
        completion_stage=payload.completion_stage,
        preferred_role=_normalize_text(
            payload.preferred_role, "선호 역할", max_length=80
        ),
        working_style=_normalize_text(
            payload.working_style, "작업 스타일", max_length=80
        ),
        commitment_pace=_normalize_text(
            payload.commitment_pace, "기대 페이스", max_length=80
        ),
        interests=_normalize_string_list(payload.interests, "관심사"),
        problem_focus=_normalize_string_list(payload.problem_focus, "풀고 싶은 문제"),
        domains=_normalize_string_list(payload.domains, "관심 도메인"),
        tech_stack=_normalize_string_list(payload.tech_stack, "기술 스택"),
        impact_tags=_normalize_impact_tags(payload.impact_tags),
        mbti=normalized_mbti,
        mbti_axis_values=normalized_mbti_axis_values,
        one_liner=_normalize_optional_text(payload.one_liner, max_length=180),
    )
    embedding_input = _build_embedding_input(normalized_payload)
    embedding = embed_text(embedding_input)

    profile = db.get(TeamfitProfile, current_user.user_id)
    if profile is None:
        profile = TeamfitProfile(user_id=current_user.user_id)
        db.add(profile)

    profile.status = "active"
    profile.completion_stage = normalized_payload.completion_stage
    profile.preferred_role = normalized_payload.preferred_role
    profile.working_style = normalized_payload.working_style
    profile.commitment_pace = normalized_payload.commitment_pace
    profile.interests = normalized_payload.interests
    profile.problem_focus = normalized_payload.problem_focus
    profile.domains = normalized_payload.domains
    profile.tech_stack = normalized_payload.tech_stack
    profile.impact_tags = normalized_payload.impact_tags
    profile.mbti = normalized_payload.mbti
    profile.mbti_axis_values = normalized_payload.mbti_axis_values
    profile.one_liner = normalized_payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, current_user.user_id, embedding)
    db.commit()
    db.refresh(profile)

    return _profile_to_response(profile)


def _cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot_product = sum(a * b for a, b in zip(left, right, strict=False))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(0.0, min(1.0, dot_product / (left_norm * right_norm)))


def _jaccard_similarity(left: Iterable[str], right: Iterable[str]) -> float:
    left_set = {item.casefold() for item in left if item}
    right_set = {item.casefold() for item in right if item}
    if not left_set or not right_set:
        return 0.0
    return len(left_set & right_set) / len(left_set | right_set)


def _bool_similarity(left: str | None, right: str | None) -> float:
    if not left or not right:
        return 0.0
    return 1.0 if left.casefold() == right.casefold() else 0.0


def _scale_mid_distance_bonus(cosine_similarity: float) -> float:
    target = 0.56
    spread = 0.34
    return max(0.0, 1.0 - abs(cosine_similarity - target) / spread)


def _safe_average(*values: float) -> float:
    return sum(values) / len(values) if values else 0.0


def _reason_tokens(
    viewer: TeamfitProfile, candidate: TeamfitProfile, bucket: str
) -> tuple[list[str], list[str]]:
    codes: list[str] = []

    if _jaccard_similarity(viewer.problem_focus, candidate.problem_focus) > 0:
        codes.append("shared_problems")
    if _jaccard_similarity(viewer.domains, candidate.domains) > 0:
        codes.append("shared_domains")
    if _jaccard_similarity(viewer.tech_stack, candidate.tech_stack) > 0:
        codes.append("shared_stack")
    if _bool_similarity(viewer.working_style, candidate.working_style) > 0:
        codes.append("same_style")
    if _bool_similarity(viewer.commitment_pace, candidate.commitment_pace) > 0:
        codes.append("same_pace")
    if bucket in {"complementary", "unexpected"} and (
        viewer.preferred_role.casefold() != candidate.preferred_role.casefold()
    ):
        codes.append("different_role")
    if (
        bucket in {"complementary", "unexpected"}
        and _jaccard_similarity(viewer.tech_stack, candidate.tech_stack) < 0.25
    ):
        codes.append("different_stack")
    if _jaccard_similarity(viewer.impact_tags, candidate.impact_tags) > 0:
        codes.append("shared_impact")

    label_map = {
        "shared_problems": "Shared problems",
        "shared_domains": "Shared domains",
        "shared_stack": "Common stack",
        "same_style": "Same style",
        "same_pace": "Same pace",
        "different_role": "Different role",
        "different_stack": "Different stack",
        "shared_impact": "Shared impact",
    }
    return codes[:3], [label_map[code] for code in codes[:3]]


def _can_share_email(viewer: User, candidate: User) -> bool:
    viewer_approved = viewer.is_admin or viewer.applicant_status == "approved"
    candidate_approved = candidate.applicant_status == "approved"
    return viewer_approved and candidate_approved


def _build_recommendation_payload(
    viewer_profile: TeamfitProfile,
    viewer_user: User,
    candidate_profile: TeamfitProfile,
    candidate_user: User,
    bucket: str,
    *,
    similarity_score: float,
    structured_fit_score: float,
) -> dict:
    reason_codes, reason_chips = _reason_tokens(
        viewer_profile, candidate_profile, bucket
    )
    return {
        "user_id": candidate_user.user_id,
        "bucket": bucket,
        "name": candidate_user.name or candidate_user.email.split("@", 1)[0],
        "gender": candidate_user.gender
        if candidate_user.gender in {"M", "F"}
        else None,
        "preferred_role": candidate_profile.preferred_role,
        "working_style": candidate_profile.working_style,
        "commitment_pace": candidate_profile.commitment_pace,
        "tech_stack": candidate_profile.tech_stack,
        "domains": candidate_profile.domains,
        "impact_tags": candidate_profile.impact_tags,
        "mbti": candidate_profile.mbti,
        "mbti_axis_values": candidate_profile.mbti_axis_values
        or _default_mbti_axis_values_from_mbti(candidate_profile.mbti),
        "one_liner": candidate_profile.one_liner,
        "reason_codes": reason_codes,
        "reason_chips": reason_chips,
        "similarity_score": round(similarity_score, 4),
        "structured_fit_score": round(structured_fit_score, 4),
        "is_verified": candidate_user.applicant_status == "approved",
        "email": candidate_user.email
        if _can_share_email(viewer_user, candidate_user)
        else None,
        "github_address": candidate_user.github_address,
        "notion_url": candidate_user.notion_url,
    }


def _fetch_pgvector_candidate_ids(
    db: Session, viewer_user_id: int, embedding: list[float]
) -> list[int]:
    rows = db.execute(
        text(
            """
            SELECT user_id
            FROM teamfit_profiles
            WHERE status = 'active'
              AND user_id != :viewer_user_id
              AND embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """
        ),
        {
            "viewer_user_id": viewer_user_id,
            "embedding": _vector_literal(embedding),
            "limit": TOP_K_CANDIDATES,
        },
    ).all()
    return [int(row[0]) for row in rows]


def _fetch_candidate_profiles(
    db: Session, viewer_profile: TeamfitProfile
) -> list[TeamfitProfile]:
    if viewer_profile.embedding_json and is_postgres_session(db):
        try:
            candidate_ids = _fetch_pgvector_candidate_ids(
                db, viewer_profile.user_id, viewer_profile.embedding_json
            )
        except Exception:  # noqa: BLE001
            candidate_ids = []
        if candidate_ids:
            profiles = db.scalars(
                select(TeamfitProfile)
                .where(TeamfitProfile.user_id.in_(candidate_ids))
                .order_by(TeamfitProfile.updated_at.desc())
            ).all()
            profile_map = {profile.user_id: profile for profile in profiles}
            return [
                profile_map[user_id]
                for user_id in candidate_ids
                if user_id in profile_map
            ]

    profiles = db.scalars(
        select(TeamfitProfile).where(
            TeamfitProfile.status == "active",
            TeamfitProfile.user_id != viewer_profile.user_id,
        )
    ).all()
    return sorted(
        profiles,
        key=lambda profile: _cosine_similarity(
            viewer_profile.embedding_json, profile.embedding_json
        ),
        reverse=True,
    )[:TOP_K_CANDIDATES]


def _bucket_scores(
    viewer: TeamfitProfile, candidate: TeamfitProfile
) -> dict[str, float]:
    cosine = _cosine_similarity(viewer.embedding_json, candidate.embedding_json)
    problem_overlap = _jaccard_similarity(viewer.problem_focus, candidate.problem_focus)
    domain_overlap = _jaccard_similarity(viewer.domains, candidate.domains)
    impact_overlap = _jaccard_similarity(viewer.impact_tags, candidate.impact_tags)
    stack_overlap = _jaccard_similarity(viewer.tech_stack, candidate.tech_stack)
    style_match = _bool_similarity(viewer.working_style, candidate.working_style)
    pace_match = _bool_similarity(viewer.commitment_pace, candidate.commitment_pace)
    role_diversity = 1.0 - _bool_similarity(
        viewer.preferred_role, candidate.preferred_role
    )
    stack_diversity = 1.0 - stack_overlap
    core_overlap = _safe_average(problem_overlap, domain_overlap)

    similar = (
        cosine * 0.50
        + core_overlap * 0.20
        + stack_overlap * 0.15
        + style_match * 0.10
        + pace_match * 0.05
    )
    complementary = (
        cosine * 0.40
        + core_overlap * 0.20
        + role_diversity * 0.15
        + stack_diversity * 0.15
        + pace_match * 0.10
    )
    unexpected = (
        _scale_mid_distance_bonus(cosine) * 0.35
        + core_overlap * 0.25
        + impact_overlap * 0.20
        + stack_diversity * 0.20
    )
    structured_fit = min(
        1.0,
        core_overlap * 0.45
        + stack_overlap * 0.15
        + style_match * 0.20
        + pace_match * 0.20,
    )

    return {
        "cosine": cosine,
        "structured_fit": structured_fit,
        "similar": similar,
        "complementary": complementary,
        "unexpected": unexpected,
    }


def _restore_extracted_signals(value: dict | None) -> TeamfitExtractedSignals:
    if not value:
        return TeamfitExtractedSignals()
    try:
        return TeamfitExtractedSignals.model_validate(value)
    except Exception:  # noqa: BLE001
        return TeamfitExtractedSignals()


def _candidate_id(user_id: int) -> str:
    return f"u_{user_id}"


def _role_family(value: str) -> str:
    if not value:
        return ""
    if value in ROLE_KEYWORDS:
        return value
    return _infer_role(value)


def _role_label(value: str) -> str:
    labels = {
        "pm_operator": "PM/기획",
        "frontend": "프론트엔드",
        "backend": "백엔드",
        "ai": "AI",
        "design": "디자인",
        "data_research": "데이터/리서치",
        "fullstack": "풀스택",
        "operations": "운영",
    }
    return labels.get(value, value or "역할 신호 미확정")


def _text_similarity(left: str, right: str) -> float:
    return _jaccard_similarity(_keyword_tokens(left), _keyword_tokens(right))


def _average_confidence(signals: TeamfitExtractedSignals) -> float:
    return (
        signals.signal_confidence.problem_statement
        + signals.signal_confidence.role
        + signals.signal_confidence.work_style
    ) / 3


def _mbti_soft_score(left: dict[str, int], right: dict[str, int]) -> float:
    total = 0.0
    for axis_id in MBTI_AXIS_IDS:
        diff = abs(left.get(axis_id, 50) - right.get(axis_id, 50)) / 100
        total += (1.0 - diff) * MBTI_AXIS_WEIGHTS[axis_id]
    return min(1.0, max(0.0, total))


def _problem_resonance_score(
    viewer_profile: TeamfitExplorerProfile,
    candidate_profile: TeamfitExplorerProfile,
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
) -> float:
    semantic = _cosine_similarity(
        viewer_profile.recommendation_embedding_json,
        candidate_profile.recommendation_embedding_json,
    )
    theme_overlap = _jaccard_similarity(
        viewer_signals.problem_themes, candidate_signals.problem_themes
    )
    motivation_overlap = _text_similarity(
        viewer_signals.why_this_problem_now,
        candidate_signals.why_this_problem_now,
    )
    return min(1.0, semantic * 0.65 + theme_overlap * 0.25 + motivation_overlap * 0.10)


def _role_complementarity_score(
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
) -> float:
    viewer_offered = _role_family(viewer_signals.offered_role)
    viewer_wanted = _role_family(viewer_signals.wanted_teammate_role)
    candidate_role = _role_family(candidate_signals.offered_role)

    wanted_match = 0.55
    if viewer_wanted:
        if candidate_role == viewer_wanted:
            wanted_match = 0.95
        elif candidate_role in ROLE_COMPATIBILITY.get(viewer_wanted, set()):
            wanted_match = 0.75
        else:
            wanted_match = 0.30

    gap_bonus = (
        0.18
        if viewer_offered and candidate_role and viewer_offered != candidate_role
        else 0.05
    )
    clone_penalty = (
        0.25
        if viewer_offered
        and candidate_role
        and viewer_offered == candidate_role
        and viewer_wanted != candidate_role
        else 0.0
    )
    return max(0.0, min(1.0, wanted_match + gap_bonus - clone_penalty))


def _work_style_match(
    viewer_signals: TeamfitExtractedSignals, candidate_signals: TeamfitExtractedSignals
) -> float:
    viewer_style = viewer_signals.work_style
    candidate_style = candidate_signals.work_style
    field_scores = [
        1.0 if viewer_style.planning_style == candidate_style.planning_style else 0.45,
        1.0
        if viewer_style.communication_style == candidate_style.communication_style
        else 0.45,
        1.0 if viewer_style.decision_style == candidate_style.decision_style else 0.45,
        1.0
        if viewer_style.execution_speed == candidate_style.execution_speed
        else 0.45,
    ]
    structured_match = _safe_average(*field_scores)
    mbti_match = _mbti_soft_score(
        viewer_signals.model_dump().get("mbti_axis_values", {}), {}
    )
    return structured_match, mbti_match


def _work_style_compatibility_score(
    viewer_profile: TeamfitExplorerProfile,
    candidate_profile: TeamfitExplorerProfile,
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
) -> float:
    viewer_style = viewer_signals.work_style
    candidate_style = candidate_signals.work_style
    field_scores = [
        1.0 if viewer_style.planning_style == candidate_style.planning_style else 0.45,
        1.0
        if viewer_style.communication_style == candidate_style.communication_style
        else 0.45,
        1.0 if viewer_style.decision_style == candidate_style.decision_style else 0.45,
        1.0
        if viewer_style.execution_speed == candidate_style.execution_speed
        else 0.45,
    ]
    structured_match = _safe_average(*field_scores)
    mbti_match = _mbti_soft_score(
        viewer_profile.mbti_axis_values, candidate_profile.mbti_axis_values
    )
    return min(1.0, structured_match * 0.7 + mbti_match * 0.3)


def _sdg_family_overlap(left: list[str], right: list[str]) -> float:
    left_families = {family for sdg in left for family in SDG_FAMILIES.get(sdg, set())}
    right_families = {
        family for sdg in right for family in SDG_FAMILIES.get(sdg, set())
    }
    if not left_families or not right_families:
        return 0.0
    return len(left_families & right_families) / len(left_families | right_families)


def _value_alignment_score(
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
) -> float:
    sdg_exact = _jaccard_similarity(viewer_signals.sdgs, candidate_signals.sdgs)
    sdg_family = _sdg_family_overlap(viewer_signals.sdgs, candidate_signals.sdgs)
    sdg_alignment = min(1.0, sdg_exact * 0.7 + sdg_family * 0.3)
    value_overlap = _jaccard_similarity(
        viewer_signals.value_themes, candidate_signals.value_themes
    )
    return min(1.0, sdg_alignment * 0.6 + value_overlap * 0.4)


def _conversation_hook_quality(signals: TeamfitExtractedSignals) -> float:
    hooks = signals.conversation_hooks
    if not hooks:
        return 0.0
    density = min(1.0, len(hooks) / 3)
    specificity = min(1.0, _safe_average(*[min(1.0, len(hook) / 70) for hook in hooks]))
    return min(1.0, density * 0.6 + specificity * 0.4)


def _conversation_potential_score(candidate_signals: TeamfitExtractedSignals) -> float:
    hook_quality = _conversation_hook_quality(candidate_signals)
    tension_richness = min(1.0, len(candidate_signals.tension_points) / 3)
    return min(
        1.0,
        hook_quality * 0.4
        + candidate_signals.profile_clarity_score * 0.3
        + tension_richness * 0.3,
    )


def _recommendation_rejection_reason(
    *,
    base_score: float,
    safe_candidate_id: int | None,
    candidate_profile: TeamfitExplorerProfile,
    viewer_profile: TeamfitExplorerProfile,
    candidate_signals: TeamfitExtractedSignals,
) -> str:
    if _average_confidence(candidate_signals) < 0.35:
        return "프로필 신호가 아직 약해 먼저 대화할 우선순위를 높이기 어렵습니다."
    if base_score < WILDCARD_THRESHOLD:
        return "문제 공명이나 협업 신호가 아직 충분히 강하지 않습니다."
    if safe_candidate_id and safe_candidate_id == candidate_profile.user_id:
        return "이미 더 높은 우선순위로 선택된 후보입니다."
    if (
        _cosine_similarity(
            viewer_profile.recommendation_embedding_json,
            candidate_profile.recommendation_embedding_json,
        )
        > 0.92
    ):
        return "이미 고른 후보와 너무 비슷해 대화 학습 가치가 낮습니다."
    return "현재 추천된 다른 후보들에 비해 역할 보완성이나 학습 가치가 낮았습니다."


def _recommendation_system_notes(
    recommended_people: list[TeamfitConversationPriorityRecommendation],
    viewer_signals: TeamfitExtractedSignals,
    candidate_count: int,
    fallback_count: int = 0,
) -> TeamfitRecommendationSystemNotes:
    limit_messages: list[str] = []
    if candidate_count < 3:
        limit_messages.append("승인된 저장 프로필 후보 수가 아직 적습니다.")
    if viewer_signals.profile_clarity_score < 0.45:
        limit_messages.append(
            "내 프로필 신호가 아직 약해 추천 품질이 보수적으로 계산되었습니다."
        )
    if len(recommended_people) < 3:
        limit_messages.append(
            "충분히 강한 신호를 가진 후보만 남겨서 3명보다 적게 반환했습니다."
        )
    if fallback_count > 0:
        limit_messages.append(
            "추천 3명을 채우기 위해 상대적으로 불확실성이 큰 후보도 함께 포함했습니다."
        )

    return TeamfitRecommendationSystemNotes(
        scoring_explanation="최종 팀 확정이 아니라, 지금 먼저 이야기해볼 가치가 높은 순서로 추천했습니다.",
        limits=" ".join(limit_messages)
        or "추천은 프로필 텍스트와 인터뷰 신호에 크게 의존하므로, 실제 대화 전까지는 불확실성이 남아 있습니다.",
        next_improvement="실제 대화 이후 피드백을 반영해 가중치와 질문 품질을 계속 보정할 예정입니다.",
    )


def _first_question_to_ask(
    recommendation_type: str,
    candidate_role: str,
    strongest_factor: str,
) -> str:
    if strongest_factor == "role_complementarity" and candidate_role:
        return f"{_role_label(candidate_role)} 관점에서 이 문제를 6개월 안에 가장 작게 증명한다면 어떤 역할 분담부터 해보고 싶나요?"
    if strongest_factor == "work_style":
        return "의견이 갈릴 때, 속도를 잃지 않으면서도 함께 결정하기 위해 어떤 방식을 가장 선호하나요?"
    if strongest_factor == "value_alignment":
        return "이 문제를 풀면서 절대 놓치고 싶지 않은 가치나 기준이 있다면 무엇인가요?"
    if recommendation_type == "wildcard_fit":
        return "이 문제를 지금과 다른 방식으로 풀어본다면, 가장 먼저 바꾸고 싶은 접근은 무엇인가요?"
    return "이 문제를 6개월 안에 가장 작게 증명한다면 어떤 실험부터 같이 해보고 싶나요?"


def _uncertainty_note(
    candidate_signals: TeamfitExtractedSignals,
    weakest_factor: str,
    used_fallback: bool = False,
) -> str:
    if used_fallback:
        return "다른 추천 후보보다 불확실성이 커서, 실제 대화로 빠르게 검증해보는 것이 좋습니다."
    if _average_confidence(candidate_signals) < 0.45:
        return "프로필 설명이 아직 짧아 실제 대화에서 역할과 협업 방식을 더 확인해봐야 합니다."
    if weakest_factor == "work_style":
        return "실제 갈등 상황에서의 의사결정 방식은 아직 확인되지 않았습니다."
    if weakest_factor == "role_complementarity":
        return "역할 기대치가 실제로 어디까지 맞는지는 대화로 더 좁혀봐야 합니다."
    if weakest_factor == "value_alignment":
        return "가치 기준은 비슷해 보여도 우선순위 차이는 직접 확인이 필요합니다."
    return "좋은 출발점이지만, 실제 협업 장면에서의 긴장 포인트는 아직 남아 있습니다."


def _reason_summary(
    recommendation_type: str,
    candidate_name: str,
    strongest_factor: str,
) -> str:
    if recommendation_type == "safe_fit":
        return f"{candidate_name}님은 문제의식이 가깝고 바로 깊은 대화를 시작하기 쉬운 후보입니다."
    if recommendation_type == "complementary_fit":
        return f"{candidate_name}님은 지금 부족한 역할이나 실행 관점을 보완해줄 가능성이 큰 후보입니다."
    if strongest_factor == "problem_resonance":
        return f"{candidate_name}님은 문제는 맞닿아 있지만 접근이 달라 새로운 시야를 열어줄 수 있는 후보입니다."
    return f"{candidate_name}님은 아직 불확실성은 있지만 한 번 먼저 대화해볼 업사이드가 있는 후보입니다."


def _reason_detail(
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
    factor_scores: dict[str, float],
) -> TeamfitRecommendationReasonDetail:
    candidate_role = _role_family(candidate_signals.offered_role)
    return TeamfitRecommendationReasonDetail(
        problem_resonance=(
            "문제 정의와 why-now 맥락이 같은 영역에 가깝습니다."
            if factor_scores["problem_resonance"] >= 0.65
            else "문제 영역은 인접하지만 실제 우선순위는 대화로 더 확인해야 합니다."
        ),
        role_complementarity=(
            f"지금 팀에 {_role_label(candidate_role)} 역할의 빈칸을 메워줄 가능성이 있습니다."
            if factor_scores["role_complementarity"] >= 0.65 and candidate_role
            else "역할 시너지는 보이지만 실제 책임 분담은 더 구체적으로 맞춰봐야 합니다."
        ),
        work_style=(
            "일을 구조화하고 결정하는 방식이 크게 충돌하지 않을 가능성이 높습니다."
            if factor_scores["work_style_compatibility"] >= 0.62
            else "협업 속도나 결정 방식은 직접 대화로 확인해봐야 합니다."
        ),
        value_alignment=(
            "SDGs와 가치 언어가 어느 정도 겹쳐 출발점이 좋습니다."
            if factor_scores["value_alignment"] >= 0.55
            else "가치 방향은 일부 맞지만 무엇을 더 우선하는지는 아직 불분명합니다."
        ),
        conversation_potential=(
            "구체 사례와 긴장 포인트가 보여 첫 대화에서 빠르게 정보를 늘릴 수 있습니다."
            if factor_scores["conversation_potential"] >= 0.55
            else "대화 실마리는 있지만 아직 설명 밀도가 높지는 않습니다."
        ),
    )


def _directory_reason_summary(
    *,
    viewer_profile_exists: bool,
    has_teamfit_profile: bool,
    strongest_factor: str | None,
) -> str:
    if not has_teamfit_profile:
        return "아직 팀핏 탐색 프로필은 없지만, 기본 정보와 링크부터 먼저 확인할 수 있습니다."
    if not viewer_profile_exists or strongest_factor is None:
        return "팀핏 탐색 프로필이 있어 문제의식과 협업 신호를 바로 살펴볼 수 있습니다."
    if strongest_factor == "problem_resonance":
        return "문제의식이 가까워 먼저 읽어볼 가치가 있는 후보입니다."
    if strongest_factor == "role_complementarity":
        return "역할 보완 가능성이 보여 먼저 살펴볼 만한 후보입니다."
    if strongest_factor == "work_style_compatibility":
        return "협업 방식이 비교적 잘 맞을 가능성이 보이는 후보입니다."
    if strongest_factor == "value_alignment":
        return "가치와 SDGs 방향이 닿아 있어 읽어볼 만한 후보입니다."
    return "대화 잠재력이 보여 먼저 살펴볼 만한 후보입니다."


def _score_candidate_for_viewer(
    *,
    viewer_profile: TeamfitExplorerProfile,
    viewer_signals: TeamfitExtractedSignals,
    candidate_profile: TeamfitExplorerProfile,
) -> tuple[dict[str, float], float]:
    candidate_signals = _restore_extracted_signals(
        candidate_profile.extracted_signals_json
    )
    factor_scores = {
        "problem_resonance": _problem_resonance_score(
            viewer_profile,
            candidate_profile,
            viewer_signals,
            candidate_signals,
        ),
        "role_complementarity": _role_complementarity_score(
            viewer_signals, candidate_signals
        ),
        "work_style_compatibility": _work_style_compatibility_score(
            viewer_profile,
            candidate_profile,
            viewer_signals,
            candidate_signals,
        ),
        "value_alignment": _value_alignment_score(viewer_signals, candidate_signals),
        "conversation_potential": _conversation_potential_score(candidate_signals),
    }
    base_score = (
        factor_scores["problem_resonance"] * 0.35
        + factor_scores["role_complementarity"] * 0.25
        + factor_scores["work_style_compatibility"] * 0.15
        + factor_scores["value_alignment"] * 0.10
        + factor_scores["conversation_potential"] * 0.15
    )
    return factor_scores, base_score


def _build_conversation_priority_recommendation(
    *,
    recommendation_type: str,
    viewer_user: User,
    viewer_profile: TeamfitExplorerProfile,
    candidate_user: User,
    candidate_profile: TeamfitExplorerProfile,
    candidate_turns: list[TeamfitExplorerTurn],
    viewer_signals: TeamfitExtractedSignals,
    candidate_signals: TeamfitExtractedSignals,
    factor_scores: dict[str, float],
    base_score: float,
    used_fallback: bool = False,
) -> TeamfitConversationPriorityRecommendation:
    strongest_factor = max(factor_scores, key=factor_scores.get)
    weakest_factor = min(factor_scores, key=factor_scores.get)
    candidate_name = candidate_user.name or candidate_user.email.split("@", 1)[0]
    candidate_role = _role_family(candidate_signals.offered_role)

    return TeamfitConversationPriorityRecommendation(
        type=recommendation_type,
        candidate_id=_candidate_id(candidate_user.user_id),
        user_id=candidate_user.user_id,
        name=candidate_name,
        problem_statement=candidate_profile.problem_statement,
        offered_role=candidate_role,
        sdgs=list(candidate_profile.sdg_tags or []),
        mbti=candidate_profile.mbti,
        base_score=round(base_score, 4),
        reason_summary=_reason_summary(
            recommendation_type, candidate_name, strongest_factor
        ),
        reason_detail=_reason_detail(viewer_signals, candidate_signals, factor_scores),
        first_question_to_ask=_first_question_to_ask(
            recommendation_type, candidate_role, strongest_factor
        ),
        uncertainty_note=_uncertainty_note(
            candidate_signals,
            weakest_factor,
            used_fallback=used_fallback,
        ),
        is_verified=candidate_user.applicant_status == "approved",
        email=candidate_user.email
        if _can_share_email(viewer_user, candidate_user)
        else None,
        github_address=candidate_user.github_address,
        notion_url=candidate_user.notion_url,
        history=[_explorer_turn_to_response(turn) for turn in candidate_turns],
    )


def _build_rejected_candidate(
    *,
    viewer_user: User,
    candidate_user: User,
    candidate_profile: TeamfitExplorerProfile,
    candidate_signals: TeamfitExtractedSignals,
    reason: str,
) -> TeamfitRejectedCandidate:
    return TeamfitRejectedCandidate(
        candidate_id=_candidate_id(candidate_user.user_id),
        name=candidate_user.name or candidate_user.email.split("@", 1)[0],
        reason=reason,
        problem_statement=candidate_profile.problem_statement,
        offered_role=_role_family(candidate_signals.offered_role),
        sdgs=list(candidate_profile.sdg_tags or []),
        mbti=candidate_profile.mbti,
        is_verified=candidate_user.applicant_status == "approved",
        email=candidate_user.email
        if _can_share_email(viewer_user, candidate_user)
        else None,
        github_address=candidate_user.github_address,
        notion_url=candidate_user.notion_url,
    )


def _pick_recommendation_candidate(
    rows: list[dict],
    *,
    threshold: float,
    problem_resonance_floor: float = 0.0,
) -> tuple[dict | None, bool]:
    def _eligible(item: dict) -> bool:
        return (
            _average_confidence(item["signals"])
            >= FALLBACK_RECOMMENDATION_CONFIDENCE_THRESHOLD
            and item["signals"].profile_clarity_score >= 0.40
            and item["factor_scores"]["conversation_potential"] >= 0.35
        )

    strong_candidate = next(
        (
            item
            for item in rows
            if item["base_score"] >= threshold
            and _eligible(item)
            and item["factor_scores"]["problem_resonance"] >= problem_resonance_floor
        ),
        None,
    )
    if strong_candidate is not None:
        return strong_candidate, False

    fallback_candidate = next(
        (
            item
            for item in rows
            if item["base_score"] >= FALLBACK_RECOMMENDATION_SCORE_THRESHOLD
            and _eligible(item)
            and item["factor_scores"]["problem_resonance"]
            >= min(problem_resonance_floor, 0.0)
        ),
        None,
    )
    if fallback_candidate is not None:
        return fallback_candidate, True

    return None, False


def get_recommendations(
    current_user: User, db: Session
) -> TeamfitRecommendationsResponse:
    viewer_profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    active_profile_count = int(db.scalar(_active_explorer_profile_count_query()) or 0)
    viewer_approved = (
        current_user.is_admin or current_user.applicant_status == "approved"
    )
    scored_candidate_ids = set(
        db.scalars(
            select(TeamfitFitCheck.target_user_id).where(
                TeamfitFitCheck.viewer_user_id == current_user.user_id,
                TeamfitFitCheck.fit_score.is_not(None),
            )
        ).all()
    )

    if viewer_profile is None or not viewer_profile.recommendation_embedding_json:
        return TeamfitRecommendationsResponse(
            requires_profile=True,
            requires_approval=not viewer_approved,
            active_profile_count=active_profile_count,
            recommended_people=[],
            rejected_or_low_signal_candidates=[],
            system_notes=TeamfitRecommendationSystemNotes(
                scoring_explanation="추천은 저장된 팀핏 탐색 프로필이 있어야 계산할 수 있습니다.",
                limits="문제 한 문장, SDGs, MBTI, 인터뷰 답변이 모두 저장된 뒤에만 추천이 열립니다.",
                next_improvement="저장 후 인터뷰를 더 쌓을수록 추천 이유가 더 선명해집니다.",
            ),
        )

    if not viewer_approved:
        return TeamfitRecommendationsResponse(
            requires_profile=False,
            requires_approval=True,
            active_profile_count=active_profile_count,
            recommended_people=[],
            rejected_or_low_signal_candidates=[],
            system_notes=TeamfitRecommendationSystemNotes(
                scoring_explanation="지금은 먼저 이야기할 가치가 높은 후보만 추천합니다.",
                limits="추천은 승인된 저장 프로필 후보만 대상으로 하며, 내 계정도 승인 상태여야 열립니다.",
                next_improvement="승인 후에는 실제 대화 우선순위 추천이 자동으로 계산됩니다.",
            ),
        )

    viewer_signals = _restore_extracted_signals(viewer_profile.extracted_signals_json)
    if viewer_signals.profile_clarity_score < 0.25:
        return TeamfitRecommendationsResponse(
            requires_profile=False,
            requires_approval=False,
            active_profile_count=active_profile_count,
            recommended_people=[],
            rejected_or_low_signal_candidates=[],
            system_notes=TeamfitRecommendationSystemNotes(
                scoring_explanation="최종 팀 확정이 아니라, 먼저 이야기할 후보를 좁히는 추천입니다.",
                limits="현재 프로필 신호가 아직 너무 약해 추천을 보수적으로 멈췄습니다. 800자 본문과 추가 질문 답변을 더 구체적으로 적어보세요.",
                next_improvement="문제의식, 내가 맡고 싶은 역할, 피하고 싶은 협업을 더 선명하게 적으면 추천이 안정됩니다.",
            ),
        )

    candidates = db.scalars(
        select(TeamfitExplorerProfile)
        .join(User, User.user_id == TeamfitExplorerProfile.user_id)
        .where(
            TeamfitExplorerProfile.user_id != current_user.user_id,
            User.applicant_status == "approved",
        )
    ).all()
    candidates = [
        candidate
        for candidate in candidates
        if (
            candidate.user_id not in scored_candidate_ids
            and candidate.recommendation_embedding_json
            and candidate.extracted_signals_json
        )
    ]
    candidates = sorted(
        candidates,
        key=lambda candidate: _cosine_similarity(
            viewer_profile.recommendation_embedding_json,
            candidate.recommendation_embedding_json,
        ),
        reverse=True,
    )[:TOP_K_CANDIDATES]

    if not candidates:
        return TeamfitRecommendationsResponse(
            requires_profile=False,
            requires_approval=False,
            active_profile_count=active_profile_count,
            recommended_people=[],
            rejected_or_low_signal_candidates=[],
            system_notes=_recommendation_system_notes([], viewer_signals, 0),
        )

    users = db.scalars(
        select(User).where(
            User.user_id.in_([profile.user_id for profile in candidates])
        )
    ).all()
    user_map = {user.user_id: user for user in users}

    scored_candidates: list[dict] = []
    for candidate in candidates:
        candidate_user = user_map.get(candidate.user_id)
        if candidate_user is None:
            continue
        candidate_signals = _restore_extracted_signals(candidate.extracted_signals_json)
        factor_scores = {
            "problem_resonance": _problem_resonance_score(
                viewer_profile,
                candidate,
                viewer_signals,
                candidate_signals,
            ),
            "role_complementarity": _role_complementarity_score(
                viewer_signals, candidate_signals
            ),
            "work_style_compatibility": _work_style_compatibility_score(
                viewer_profile,
                candidate,
                viewer_signals,
                candidate_signals,
            ),
            "value_alignment": _value_alignment_score(
                viewer_signals, candidate_signals
            ),
            "conversation_potential": _conversation_potential_score(candidate_signals),
        }
        base_score = (
            factor_scores["problem_resonance"] * 0.35
            + factor_scores["role_complementarity"] * 0.25
            + factor_scores["work_style_compatibility"] * 0.15
            + factor_scores["value_alignment"] * 0.10
            + factor_scores["conversation_potential"] * 0.15
        )
        scored_candidates.append(
            {
                "profile": candidate,
                "user": candidate_user,
                "signals": candidate_signals,
                "factor_scores": factor_scores,
                "base_score": base_score,
            }
        )

    scored_candidates.sort(key=lambda item: item["base_score"], reverse=True)

    selected: list[dict] = []
    used_ids: set[int] = set()
    rejected: list[TeamfitRejectedCandidate] = []
    fallback_count = 0
    candidate_turns_cache: dict[int, list[TeamfitExplorerTurn]] = {}

    def _candidate_turns(user_id: int) -> list[TeamfitExplorerTurn]:
        if user_id not in candidate_turns_cache:
            candidate_turns_cache[user_id] = _load_explorer_turns(db, user_id)
        return candidate_turns_cache[user_id]

    safe_candidate, safe_used_fallback = _pick_recommendation_candidate(
        scored_candidates,
        threshold=SAFE_FIT_THRESHOLD,
        problem_resonance_floor=0.25,
    )
    if safe_candidate is not None:
        used_ids.add(safe_candidate["user"].user_id)
        fallback_count += int(safe_used_fallback)
        selected.append(
            _build_conversation_priority_recommendation(
                recommendation_type="safe_fit",
                viewer_user=current_user,
                viewer_profile=viewer_profile,
                candidate_user=safe_candidate["user"],
                candidate_profile=safe_candidate["profile"],
                candidate_turns=_candidate_turns(safe_candidate["user"].user_id),
                viewer_signals=viewer_signals,
                candidate_signals=safe_candidate["signals"],
                factor_scores=safe_candidate["factor_scores"],
                base_score=safe_candidate["base_score"],
                used_fallback=safe_used_fallback,
            )
        )

    complementary_rows = [
        item for item in scored_candidates if item["user"].user_id not in used_ids
    ]
    if complementary_rows:
        safe_profile = safe_candidate["profile"] if safe_candidate else None
        complementary_rows.sort(
            key=lambda item: (
                item["base_score"]
                + (
                    0.12
                    if _role_family(viewer_signals.offered_role)
                    != _role_family(item["signals"].offered_role)
                    else 0.0
                )
                - (
                    _cosine_similarity(
                        safe_profile.recommendation_embedding_json,
                        item["profile"].recommendation_embedding_json,
                    )
                    * 0.20
                    if safe_profile is not None
                    else 0.0
                )
            ),
            reverse=True,
        )
        complementary_candidate, complementary_used_fallback = (
            _pick_recommendation_candidate(
                complementary_rows,
                threshold=COMPLEMENTARY_THRESHOLD,
                problem_resonance_floor=0.20,
            )
        )
        if complementary_candidate is not None:
            used_ids.add(complementary_candidate["user"].user_id)
            fallback_count += int(complementary_used_fallback)
            selected.append(
                _build_conversation_priority_recommendation(
                    recommendation_type="complementary_fit",
                    viewer_user=current_user,
                    viewer_profile=viewer_profile,
                    candidate_user=complementary_candidate["user"],
                    candidate_profile=complementary_candidate["profile"],
                    candidate_turns=_candidate_turns(
                        complementary_candidate["user"].user_id
                    ),
                    viewer_signals=viewer_signals,
                    candidate_signals=complementary_candidate["signals"],
                    factor_scores=complementary_candidate["factor_scores"],
                    base_score=complementary_candidate["base_score"],
                    used_fallback=complementary_used_fallback,
                )
            )

    wildcard_rows = [
        item for item in scored_candidates if item["user"].user_id not in used_ids
    ]
    if wildcard_rows:
        safe_embedding = (
            safe_candidate["profile"].recommendation_embedding_json
            if safe_candidate
            else None
        )
        wildcard_rows.sort(
            key=lambda item: (
                item["base_score"]
                + (
                    1.0
                    - _cosine_similarity(
                        viewer_profile.recommendation_embedding_json,
                        item["profile"].recommendation_embedding_json,
                    )
                )
                * 0.15
                + min(1.0, len(item["signals"].tension_points) / 3) * 0.10
                + (
                    (
                        1.0
                        - _cosine_similarity(
                            safe_embedding,
                            item["profile"].recommendation_embedding_json,
                        )
                    )
                    * 0.10
                    if safe_embedding is not None
                    else 0.0
                )
            ),
            reverse=True,
        )
        wildcard_candidate, wildcard_used_fallback = _pick_recommendation_candidate(
            wildcard_rows,
            threshold=WILDCARD_THRESHOLD,
            problem_resonance_floor=0.18,
        )
        if wildcard_candidate is not None:
            used_ids.add(wildcard_candidate["user"].user_id)
            fallback_count += int(wildcard_used_fallback)
            selected.append(
                _build_conversation_priority_recommendation(
                    recommendation_type="wildcard_fit",
                    viewer_user=current_user,
                    viewer_profile=viewer_profile,
                    candidate_user=wildcard_candidate["user"],
                    candidate_profile=wildcard_candidate["profile"],
                    candidate_turns=_candidate_turns(
                        wildcard_candidate["user"].user_id
                    ),
                    viewer_signals=viewer_signals,
                    candidate_signals=wildcard_candidate["signals"],
                    factor_scores=wildcard_candidate["factor_scores"],
                    base_score=wildcard_candidate["base_score"],
                    used_fallback=wildcard_used_fallback,
                )
            )

    safe_candidate_id = safe_candidate["profile"].user_id if safe_candidate else None
    for item in scored_candidates:
        if item["user"].user_id in used_ids:
            continue
        rejection_reason = _recommendation_rejection_reason(
            base_score=item["base_score"],
            safe_candidate_id=safe_candidate_id,
            candidate_profile=item["profile"],
            viewer_profile=viewer_profile,
            candidate_signals=item["signals"],
        )
        rejected.append(
            _build_rejected_candidate(
                viewer_user=current_user,
                candidate_user=item["user"],
                candidate_profile=item["profile"],
                candidate_signals=item["signals"],
                reason=rejection_reason,
            )
        )
        if len(rejected) >= 5:
            break

    return TeamfitRecommendationsResponse(
        requires_profile=False,
        requires_approval=False,
        active_profile_count=active_profile_count,
        recommended_people=selected,
        rejected_or_low_signal_candidates=rejected,
        system_notes=_recommendation_system_notes(
            selected,
            viewer_signals,
            len(candidates),
            fallback_count=fallback_count,
        ),
    )


def get_teamfit_candidate_directory(
    current_user: User,
    db: Session,
) -> TeamfitCandidateDirectoryResponse:
    if not current_user.is_admin and current_user.applicant_status != "approved":
        return TeamfitCandidateDirectoryResponse(
            requires_approval=True,
            candidates=[],
            total_count=0,
        )

    users = db.scalars(
        select(User)
        .where(User.user_id != current_user.user_id)
        .order_by(User.created_at.desc(), User.user_id.desc())
    ).all()

    if not users:
        return TeamfitCandidateDirectoryResponse(
            requires_approval=False,
            candidates=[],
            total_count=0,
        )

    user_ids = [user.user_id for user in users]
    profiles = db.scalars(
        select(TeamfitExplorerProfile).where(
            TeamfitExplorerProfile.user_id.in_(user_ids)
        )
    ).all()
    profile_map = {profile.user_id: profile for profile in profiles}
    fit_checks = db.scalars(
        select(TeamfitFitCheck).where(
            TeamfitFitCheck.viewer_user_id == current_user.user_id,
            TeamfitFitCheck.target_user_id.in_(user_ids),
        )
    ).all()
    fit_check_map = {fit_check.target_user_id: fit_check for fit_check in fit_checks}

    viewer_profile = db.get(TeamfitExplorerProfile, current_user.user_id)
    viewer_signals = (
        _restore_extracted_signals(viewer_profile.extracted_signals_json)
        if viewer_profile and viewer_profile.extracted_signals_json
        else None
    )

    candidate_turns_cache: dict[int, list[TeamfitExplorerTurn]] = {}

    def _candidate_turns(user_id: int) -> list[TeamfitExplorerTurn]:
        if user_id not in candidate_turns_cache:
            candidate_turns_cache[user_id] = _load_explorer_turns(db, user_id)
        return candidate_turns_cache[user_id]

    score_map: dict[int, float] = {}
    strongest_factor_map: dict[int, str] = {}
    if (
        viewer_profile
        and viewer_profile.recommendation_embedding_json
        and viewer_signals
    ):
        for user in users:
            candidate_profile = profile_map.get(user.user_id)
            if (
                candidate_profile is None
                or not candidate_profile.recommendation_embedding_json
                or not candidate_profile.extracted_signals_json
            ):
                continue
            factor_scores, base_score = _score_candidate_for_viewer(
                viewer_profile=viewer_profile,
                viewer_signals=viewer_signals,
                candidate_profile=candidate_profile,
            )
            score_map[user.user_id] = round(base_score, 4)
            strongest_factor_map[user.user_id] = max(
                factor_scores, key=factor_scores.get
            )

    ranked_user_ids = [
        user_id
        for user_id, _score in sorted(
            score_map.items(), key=lambda item: item[1], reverse=True
        )
    ]
    rank_map = {
        user_id: index for index, user_id in enumerate(ranked_user_ids, start=1)
    }

    items: list[TeamfitCandidateDirectoryItem] = []
    for user in users:
        candidate_profile = profile_map.get(user.user_id)
        has_teamfit_profile = candidate_profile is not None
        candidate_signals = (
            _restore_extracted_signals(candidate_profile.extracted_signals_json)
            if candidate_profile and candidate_profile.extracted_signals_json
            else None
        )
        items.append(
            TeamfitCandidateDirectoryItem(
                user_id=user.user_id,
                candidate_id=_candidate_id(user.user_id),
                name=user.name or user.email.split("@", 1)[0],
                has_teamfit_profile=has_teamfit_profile,
                fit_score=fit_check_map.get(user.user_id).fit_score
                if fit_check_map.get(user.user_id)
                else None,
                fit_note=fit_check_map.get(user.user_id).fit_note
                if fit_check_map.get(user.user_id)
                else None,
                reason_summary=_directory_reason_summary(
                    viewer_profile_exists=viewer_profile is not None,
                    has_teamfit_profile=has_teamfit_profile,
                    strongest_factor=strongest_factor_map.get(user.user_id),
                ),
                reason_detail=(
                    _reason_detail(
                        viewer_signals,
                        candidate_signals,
                        {
                            "problem_resonance": _problem_resonance_score(
                                viewer_profile,
                                candidate_profile,
                                viewer_signals,
                                candidate_signals,
                            ),
                            "role_complementarity": _role_complementarity_score(
                                viewer_signals, candidate_signals
                            ),
                            "work_style_compatibility": _work_style_compatibility_score(
                                viewer_profile,
                                candidate_profile,
                                viewer_signals,
                                candidate_signals,
                            ),
                            "value_alignment": _value_alignment_score(
                                viewer_signals, candidate_signals
                            ),
                            "conversation_potential": _conversation_potential_score(
                                candidate_signals
                            ),
                        },
                    )
                    if viewer_profile
                    and viewer_signals
                    and candidate_profile
                    and candidate_signals
                    else None
                ),
                problem_statement=candidate_profile.problem_statement
                if candidate_profile
                else "",
                offered_role=_role_family(candidate_signals.offered_role)
                if candidate_signals
                else "",
                sdgs=list(candidate_profile.sdg_tags or [])
                if candidate_profile
                else [],
                mbti=candidate_profile.mbti if candidate_profile else None,
                is_verified=user.applicant_status == "approved",
                email=user.email if _can_share_email(current_user, user) else None,
                github_address=user.github_address,
                notion_url=user.notion_url,
                history=[
                    _explorer_turn_to_response(turn)
                    for turn in _candidate_turns(user.user_id)
                ]
                if candidate_profile
                else [],
                created_at=user.created_at,
                profile_updated_at=candidate_profile.updated_at
                if candidate_profile
                else None,
                teamfit_score=score_map.get(user.user_id),
                teamfit_rank=rank_map.get(user.user_id),
            )
        )

    return TeamfitCandidateDirectoryResponse(
        requires_approval=False,
        candidates=items,
        total_count=len(items),
    )


def set_teamfit_fit_check(
    target_user_id: int,
    payload: TeamfitFitCheckUpdate,
    current_user: User,
    db: Session,
) -> TeamfitFitCheckState:
    if not current_user.is_admin and current_user.applicant_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="합격 인증 승인 후에만 팀핏 핏 점수를 저장할 수 있습니다.",
        )

    if target_user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="내 프로필에는 핏 점수를 저장할 수 없습니다.",
        )

    target_user = db.scalar(
        select(User).where(
            User.user_id == target_user_id,
            User.applicant_status == "approved",
        )
    )
    if target_user is None or db.get(TeamfitExplorerProfile, target_user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="대상 후보를 찾을 수 없습니다.",
        )

    fit_check = db.scalar(
        select(TeamfitFitCheck).where(
            TeamfitFitCheck.viewer_user_id == current_user.user_id,
            TeamfitFitCheck.target_user_id == target_user_id,
        )
    )
    if fit_check is None:
        fit_check = TeamfitFitCheck(
            viewer_user_id=current_user.user_id,
            target_user_id=target_user_id,
        )
        db.add(fit_check)

    fit_check.fit_score = payload.fit_score
    fit_check.fit_note = _normalize_optional_text(payload.fit_note, max_length=500)

    db.commit()
    db.refresh(fit_check)

    return TeamfitFitCheckState(
        target_user_id=target_user_id,
        fit_score=fit_check.fit_score,
        fit_note=fit_check.fit_note,
        updated_at=fit_check.updated_at,
    )
