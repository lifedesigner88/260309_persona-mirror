from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User

from .models import TeamfitExplorerProfile, TeamfitExplorerTurn, TeamfitProfile
from .schemas import TeamfitProfileUpsertRequest
from .service import (
    EXTRACTION_VERSION,
    _build_embedding_input,
    _build_enriched_markdown,
    _fallback_extract_signals,
    embed_text,
    sync_pgvector_embedding,
)

MBTI_AXIS_IDS = ("mind", "energy", "nature", "tactics", "identity")
SDG_TAG_IDS = frozenset(
    {
        "no_poverty",
        "zero_hunger",
        "good_health_well_being",
        "quality_education",
        "gender_equality",
        "clean_water_sanitation",
        "affordable_clean_energy",
        "decent_work_economic_growth",
        "industry_innovation_infrastructure",
        "reduced_inequalities",
        "sustainable_cities_communities",
        "responsible_consumption_production",
        "climate_action",
        "life_below_water",
        "life_on_land",
        "peace_justice_strong_institutions",
        "partnerships_for_the_goals",
    }
)
LEGACY_DEMO_ONE_LINERS = frozenset(
    {
        "Founder-PM who ships fast and cares about durable team alignment.",
        "Backend owner who likes clear scope, durable infra, and calm execution.",
        "Frontend builder focused on trust, clarity, and fast product feedback loops.",
        "Research-minded teammate who likes turning fuzzy people questions into usable systems.",
        "Full-stack generalist who optimizes for fast demo-to-feedback cycles.",
        "Operator-PM who keeps teams aligned and user promises realistic.",
    }
)

DEMO_TEAMFIT_USERS = [
    {
        "email": "lifedesigner88@gmail.com",
        "password": "123456",
        "name": "박세종 (demo)",
        "github_address": "https://github.com/lifedesigner88",
        "notion_url": "https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "founder_pm",
            "working_style": "documentation",
            "commitment_pace": "steady_daily",
            "interests": ["ai_tools", "product_building", "education"],
            "problem_focus": ["find_teammates", "clarify_scope"],
            "domains": ["team_building", "education", "community"],
            "tech_stack": ["python", "fastapi", "react", "postgresql"],
            "impact_tags": [
                "quality_education",
                "sustainable_cities_communities",
                "reduced_inequalities",
                "industry_innovation_infrastructure",
            ],
            "mbti": "INFJ-T",
            "mbti_axis_values": {
                "mind": 82,
                "energy": 74,
                "nature": 68,
                "tactics": 71,
                "identity": 79,
            },
            "one_liner": "문서로 판을 깔고, 코드로 마감하는 Founder-PM입니다.",
        },
    },
    {
        "email": "minseo.builder@example.com",
        "password": "123456",
        "name": "김민서 (demo)",
        "github_address": "https://github.com/example-minseo",
        "notion_url": "https://example.notion.site/minseo-builder",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "backend_ai_infra",
            "working_style": "async",
            "commitment_pace": "steady_daily",
            "interests": ["ai_tools", "research", "product_building"],
            "problem_focus": ["own_operations", "keep_momentum"],
            "domains": ["team_building", "productivity", "community"],
            "tech_stack": ["python", "fastapi", "postgresql", "docker", "aws"],
            "impact_tags": [
                "decent_work_economic_growth",
                "industry_innovation_infrastructure",
                "climate_action",
                "sustainable_cities_communities",
            ],
            "mbti": "INTJ-A",
            "mbti_axis_values": {
                "mind": 77,
                "energy": 70,
                "nature": 33,
                "tactics": 66,
                "identity": 27,
            },
            "one_liner": "복잡한 백엔드는 조용히 정리하고, 팀 속도는 끝까지 살리는 사람입니다.",
        },
    },
    {
        "email": "haeun.frontend@example.com",
        "password": "123456",
        "name": "박하은 (demo)",
        "github_address": "https://github.com/example-haeun",
        "notion_url": "https://example.notion.site/haeun-ui",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "frontend_ux_product",
            "working_style": "user_interviews",
            "commitment_pace": "sprint_mode",
            "interests": ["design", "product_building", "community"],
            "problem_focus": ["find_teammates", "validate_users"],
            "domains": ["team_building", "creator_tools", "community"],
            "tech_stack": ["typescript", "react", "supabase"],
            "impact_tags": [
                "sustainable_cities_communities",
                "reduced_inequalities",
                "quality_education",
                "gender_equality",
            ],
            "mbti": "ENFJ-A",
            "mbti_axis_values": {
                "mind": 24,
                "energy": 68,
                "nature": 73,
                "tactics": 64,
                "identity": 29,
            },
            "one_liner": "예쁜 화면보다 믿고 누를 수 있는 화면을 더 집요하게 만드는 프론트엔드입니다.",
        },
    },
    {
        "email": "jiyoon.research@example.com",
        "password": "123456",
        "name": "이지윤 (demo)",
        "github_address": "https://github.com/example-jiyoon",
        "notion_url": "https://example.notion.site/jiyoon-research",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "data_ai_research",
            "working_style": "research_first",
            "commitment_pace": "steady_deep_work",
            "interests": ["research", "ai_tools", "education"],
            "problem_focus": ["find_teammates", "validate_users"],
            "domains": ["team_building", "mental_health", "education"],
            "tech_stack": ["python", "postgresql", "analytics"],
            "impact_tags": [
                "good_health_well_being",
                "quality_education",
                "reduced_inequalities",
                "peace_justice_strong_institutions",
            ],
            "mbti": "INTP-T",
            "mbti_axis_values": {
                "mind": 71,
                "energy": 66,
                "nature": 31,
                "tactics": 28,
                "identity": 77,
            },
            "one_liner": "애매한 사람 문제를 데이터와 구조로 번역하는 연구 메이트입니다.",
        },
    },
    {
        "email": "taeho.fullstack@example.com",
        "password": "123456",
        "name": "정태호 (demo)",
        "github_address": "https://github.com/example-taeho",
        "notion_url": "https://example.notion.site/taeho-fullstack",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step1",
            "preferred_role": "fullstack_builder",
            "working_style": "fast_iteration",
            "commitment_pace": "weeknights_and_weekends",
            "interests": ["product_building", "ai_tools", "community"],
            "problem_focus": ["ship_fast", "validate_users"],
            "domains": ["productivity", "team_building", "climate"],
            "tech_stack": ["typescript", "react", "supabase", "docker"],
            "impact_tags": [
                "climate_action",
                "decent_work_economic_growth",
                "industry_innovation_infrastructure",
                "responsible_consumption_production",
            ],
            "mbti": "ENTP-A",
            "mbti_axis_values": {
                "mind": 26,
                "energy": 63,
                "nature": 35,
                "tactics": 24,
                "identity": 31,
            },
            "one_liner": "오늘 데모 띄우고 내일 피드백 받는 속도를 사랑하는 풀스택입니다.",
        },
    },
    {
        "email": "soyeon.mission@example.com",
        "password": "123456",
        "name": "최소연 (demo)",
        "github_address": "https://github.com/example-soyeon",
        "notion_url": "https://example.notion.site/soyeon-mission",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "pm_operator",
            "working_style": "structured_planning",
            "commitment_pace": "steady_daily",
            "interests": ["community", "education", "design"],
            "problem_focus": ["keep_momentum", "clarify_scope"],
            "domains": ["community", "accessibility", "education"],
            "tech_stack": ["notion", "figma", "sql", "analytics"],
            "impact_tags": [
                "reduced_inequalities",
                "quality_education",
                "sustainable_cities_communities",
                "clean_water_sanitation",
            ],
            "mbti": "ISFJ-T",
            "mbti_axis_values": {
                "mind": 75,
                "energy": 29,
                "nature": 69,
                "tactics": 72,
                "identity": 78,
            },
            "one_liner": "회의는 짧게, 약속은 정확하게, 팀 흐름은 오래 가게 만드는 운영형 PM입니다.",
        },
    },
    {
        "email": "nari.pm@example.com",
        "password": "123456",
        "name": "오나리 (demo)",
        "github_address": "https://github.com/example-nari",
        "notion_url": "https://example.notion.site/nari-pm",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "pm_operator",
            "working_style": "structured_planning",
            "commitment_pace": "steady_daily",
            "interests": ["education", "community", "product_building"],
            "problem_focus": ["clarify_scope", "find_teammates"],
            "domains": ["education", "team_building", "community"],
            "tech_stack": ["notion", "sql", "analytics", "figma"],
            "impact_tags": [
                "quality_education",
                "reduced_inequalities",
                "good_health_well_being",
                "partnerships_for_the_goals",
            ],
            "mbti": "ENFP-T",
            "mbti_axis_values": {
                "mind": 28,
                "energy": 72,
                "nature": 69,
                "tactics": 34,
                "identity": 76,
            },
            "one_liner": "문제를 사람 언어로 다시 쓰고, 팀이 같은 방향으로 움직이게 만드는 PM입니다.",
        },
    },
    {
        "email": "seungwoo.backend@example.com",
        "password": "123456",
        "name": "한승우 (demo)",
        "github_address": "https://github.com/example-seungwoo",
        "notion_url": "https://example.notion.site/seungwoo-backend",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "backend_ai_infra",
            "working_style": "async",
            "commitment_pace": "steady_deep_work",
            "interests": ["ai_tools", "product_building", "community"],
            "problem_focus": ["own_operations", "keep_momentum"],
            "domains": ["team_building", "productivity", "ai_tools"],
            "tech_stack": ["python", "fastapi", "postgresql", "docker", "gcp"],
            "impact_tags": [
                "industry_innovation_infrastructure",
                "decent_work_economic_growth",
                "quality_education",
                "partnerships_for_the_goals",
            ],
            "mbti": "ISTJ-A",
            "mbti_axis_values": {
                "mind": 79,
                "energy": 31,
                "nature": 37,
                "tactics": 74,
                "identity": 24,
            },
            "one_liner": "불안정한 아이디어를 끝까지 굴러가는 백엔드 구조로 바꾸는 사람입니다.",
        },
    },
    {
        "email": "yubin.ai@example.com",
        "password": "123456",
        "name": "장유빈 (demo)",
        "github_address": "https://github.com/example-yubin",
        "notion_url": "https://example.notion.site/yubin-ai",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "data_ai_research",
            "working_style": "research_first",
            "commitment_pace": "steady_deep_work",
            "interests": ["ai_tools", "research", "mental_health"],
            "problem_focus": ["validate_users", "clarify_scope"],
            "domains": ["education", "mental_health", "team_building"],
            "tech_stack": ["python", "pandas", "postgresql", "llm"],
            "impact_tags": [
                "good_health_well_being",
                "quality_education",
                "reduced_inequalities",
                "industry_innovation_infrastructure",
            ],
            "mbti": "INFP-T",
            "mbti_axis_values": {
                "mind": 73,
                "energy": 67,
                "nature": 76,
                "tactics": 36,
                "identity": 78,
            },
            "one_liner": "사람의 서사를 질문 데이터로 바꾸고, 다시 제품 힌트로 돌려주는 AI 리서처입니다.",
        },
    },
    {
        "email": "arin.design@example.com",
        "password": "123456",
        "name": "김아린 (demo)",
        "github_address": "https://github.com/example-arin",
        "notion_url": "https://example.notion.site/arin-design",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "frontend_ux_product",
            "working_style": "user_interviews",
            "commitment_pace": "sprint_mode",
            "interests": ["design", "community", "creator_tools"],
            "problem_focus": ["validate_users", "find_teammates"],
            "domains": ["team_building", "creator_tools", "education"],
            "tech_stack": ["figma", "typescript", "react", "framer"],
            "impact_tags": [
                "quality_education",
                "gender_equality",
                "reduced_inequalities",
                "sustainable_cities_communities",
            ],
            "mbti": "ESFP-A",
            "mbti_axis_values": {
                "mind": 22,
                "energy": 39,
                "nature": 72,
                "tactics": 27,
                "identity": 24,
            },
            "one_liner": "복잡한 사람 정보를 대화하고 싶어지는 인터페이스로 번역하는 디자이너입니다.",
        },
    },
    {
        "email": "donghyun.ops@example.com",
        "password": "123456",
        "name": "서동현 (demo)",
        "github_address": "https://github.com/example-donghyun",
        "notion_url": "https://example.notion.site/donghyun-ops",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "pm_operator",
            "working_style": "documentation",
            "commitment_pace": "weeknights_and_weekends",
            "interests": ["community", "operations", "education"],
            "problem_focus": ["keep_momentum", "own_operations"],
            "domains": ["community", "team_building", "accessibility"],
            "tech_stack": ["notion", "airtable", "sql", "automation"],
            "impact_tags": [
                "partnerships_for_the_goals",
                "sustainable_cities_communities",
                "quality_education",
                "reduced_inequalities",
            ],
            "mbti": "ESTJ-T",
            "mbti_axis_values": {
                "mind": 32,
                "energy": 29,
                "nature": 26,
                "tactics": 76,
                "identity": 73,
            },
            "one_liner": "흩어지는 팀을 약속과 운영 리듬으로 다시 붙잡는 운영 메이트입니다.",
        },
    },
    {
        "email": "hyunseo.fullstack@example.com",
        "password": "123456",
        "name": "윤현서 (demo)",
        "github_address": "https://github.com/example-hyunseo",
        "notion_url": "https://example.notion.site/hyunseo-fullstack",
        "applicant_status": "approved",
        "profile": {
            "completion_stage": "step2",
            "preferred_role": "fullstack_builder",
            "working_style": "fast_iteration",
            "commitment_pace": "steady_daily",
            "interests": ["product_building", "analytics", "ai_tools"],
            "problem_focus": ["ship_fast", "validate_users"],
            "domains": ["education", "productivity", "team_building"],
            "tech_stack": ["typescript", "react", "nextjs", "postgresql", "analytics"],
            "impact_tags": [
                "industry_innovation_infrastructure",
                "quality_education",
                "decent_work_economic_growth",
                "responsible_consumption_production",
            ],
            "mbti": "ENTJ-A",
            "mbti_axis_values": {
                "mind": 27,
                "energy": 61,
                "nature": 29,
                "tactics": 68,
                "identity": 25,
            },
            "one_liner": "실험 데이터를 바로 제품 개선으로 연결하는 풀스택 빌더입니다.",
        },
    },
]

DEMO_INTERVIEW_QUESTIONS = (
    "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
    "함께할 팀원을 고를 때 꼭 맞아야 하는 협업 장면이나 역할 조합은 무엇인가요?",
    "6개월 뒤 이 문제를 잘 풀었다고 느끼게 해줄 가장 구체적인 결과는 무엇인가요?",
)


def _demo_markdown(
    *,
    why: str,
    role: str,
    contribution: str,
    teammate: str,
    collaboration: str,
) -> str:
    return (
        "## 왜 이 문제를 풀고 싶나\n"
        f"{why}\n\n"
        "## 내가 팀에서 맡고 싶은 역할\n"
        f"{role}\n\n"
        "## 내가 줄 수 있는 것\n"
        f"{contribution}\n\n"
        "## 같이 대화해보고 싶은 사람\n"
        f"{teammate}\n\n"
        "## 잘 맞는 협업 / 피하고 싶은 협업\n"
        f"{collaboration}"
    )


def _demo_history(answer_1: str, answer_2: str, answer_3: str) -> list[dict[str, str]]:
    return [
        {
            "phase": "initial",
            "question": DEMO_INTERVIEW_QUESTIONS[0],
            "answer": answer_1,
        },
        {
            "phase": "initial",
            "question": DEMO_INTERVIEW_QUESTIONS[1],
            "answer": answer_2,
        },
        {
            "phase": "initial",
            "question": DEMO_INTERVIEW_QUESTIONS[2],
            "answer": answer_3,
        },
    ]


DEMO_EXPLORER_PROFILES: dict[str, dict[str, object]] = {
    "lifedesigner88@gmail.com": {
        "problem_statement": "팀빌딩에서 누구와 먼저 대화해야 할지 더 잘 좁히는 구조 만들기",
        "mbti": "INFJ-T",
        "mbti_axis_values": {
            "mind": 82,
            "energy": 74,
            "nature": 68,
            "tactics": 71,
            "identity": 79,
        },
        "sdg_tags": [
            "quality_education",
            "sustainable_cities_communities",
            "reduced_inequalities",
            "industry_innovation_infrastructure",
        ],
        "narrative_markdown": _demo_markdown(
            why="300명 중 누구와 먼저 이야기해야 하는지를 더 잘 좁히는 구조가 있으면 팀빌딩의 질 자체가 달라질 수 있다고 느낍니다.",
            role="Founder-PM으로 문제 정의, 인터뷰 설계, 방향 정렬, 문서화를 맡고 싶습니다.",
            contribution="문제 framing, 사용자 맥락 이해, 빠른 문서화, MVP 설계와 운영 리듬을 팀에 줄 수 있습니다.",
            teammate="백엔드-AI와 프론트-UX를 각자 소유하면서도, 문제의식을 같이 밀어붙일 사람과 먼저 대화하고 싶습니다.",
            collaboration="문서를 먼저 맞추고 작게 실험하는 협업이 잘 맞습니다. 말만 많고 오너십이 흐린 협업은 피하고 싶습니다.",
        ),
        "history": _demo_history(
            "직접 만나기 전에 누구를 먼저 만나야 하는지 좁히는 문제는 제 팀빌딩 경험에서 가장 실제적인 pain 이었습니다.",
            "문제 정의를 같이 붙잡는 PM과, 실행을 끝까지 가져가는 백엔드/프론트 오너 조합이 꼭 맞아야 합니다.",
            "추천이 정답을 선언하지 않더라도, 먼저 대화할 세 사람이 선명하게 좁혀지면 잘 풀었다고 느낄 것 같습니다.",
        ),
    },
    "minseo.builder@example.com": {
        "problem_statement": "작은 팀이 AI 제품을 안정적으로 배포하고 운영하게 돕는 협업 OS 만들기",
        "mbti": "INTJ-A",
        "mbti_axis_values": {
            "mind": 77,
            "energy": 70,
            "nature": 33,
            "tactics": 66,
            "identity": 27,
        },
        "sdg_tags": [
            "decent_work_economic_growth",
            "industry_innovation_infrastructure",
            "climate_action",
            "sustainable_cities_communities",
        ],
        "narrative_markdown": _demo_markdown(
            why="좋은 아이디어도 운영과 배포 구조가 약하면 팀이 쉽게 지친다는 걸 자주 봤습니다.",
            role="백엔드-AI-Infra 오너로 데이터 모델, API, 배포 안정성을 끝까지 책임지고 싶습니다.",
            contribution="FastAPI, Postgres, Docker, 운영 자동화, 장애 대응과 실험 인프라를 바로 줄 수 있습니다.",
            teammate="문제를 선명하게 정의하는 PM과, 첫 인상을 책임지는 프론트 오너를 만나고 싶습니다.",
            collaboration="조용하지만 명확하게 약속하고, 작은 배포를 자주 반복하는 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "요즘은 팀이 아이디어보다 운영 난이도 때문에 더 빨리 무너진다고 느껴서, 이 부분을 직접 풀고 싶습니다.",
            "PM이 scope 를 잘 자르고, 저는 백엔드와 infra 를 안정적으로 받치는 역할 조합이 가장 좋습니다.",
            "팀이 일주일 단위로 배포와 회고를 계속 돌릴 수 있다면 이 문제를 잘 푼 것이라고 느낄 것 같습니다.",
        ),
    },
    "haeun.frontend@example.com": {
        "problem_statement": "처음 만나는 사람들이 빠르게 서로를 이해하게 돕는 팀빌딩 인터페이스 만들기",
        "mbti": "ENFJ-A",
        "mbti_axis_values": {
            "mind": 24,
            "energy": 68,
            "nature": 73,
            "tactics": 64,
            "identity": 29,
        },
        "sdg_tags": [
            "sustainable_cities_communities",
            "reduced_inequalities",
            "quality_education",
            "gender_equality",
        ],
        "narrative_markdown": _demo_markdown(
            why="사람을 고를 때 정보가 너무 빈약하면 결국 촉으로 끝나는 경험이 반복돼서, 더 나은 첫 화면이 필요하다고 느꼈습니다.",
            role="프론트-UX 오너로 첫 인상, 자기소개 흐름, 카드 UI, 모바일 경험을 책임지고 싶습니다.",
            contribution="React 기반 제품 구현, 인터뷰 인사이트를 UI 로 번역하는 감각, 신뢰감 있는 시각 정리를 줄 수 있습니다.",
            teammate="백엔드 오너와 기획 오너가 분명하고, 사용자 관찰을 중요하게 여기는 사람과 먼저 이야기하고 싶습니다.",
            collaboration="사용자 피드백을 보고 바로 화면을 다듬는 빠른 반복형 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "짧은 팀빌딩 시간 안에 첫 화면이 대화의 질을 크게 바꾸는 장면을 많이 봐서 이 문제를 붙잡고 있습니다.",
            "문제 정의를 잘하는 PM과, 구현을 빠르게 이어가는 백엔드가 같이 있을 때 가장 좋은 속도가 납니다.",
            "사람들이 자기소개와 팀 탐색을 덜 피곤하게 느끼고, 대화 시작률이 올라가면 잘 풀었다고 볼 수 있습니다.",
        ),
    },
    "jiyoon.research@example.com": {
        "problem_statement": "짧은 대화만으로도 사람의 문제의식과 협업 스타일을 더 잘 파악하는 인터뷰 시스템 만들기",
        "mbti": "INTP-T",
        "mbti_axis_values": {
            "mind": 71,
            "energy": 66,
            "nature": 31,
            "tactics": 28,
            "identity": 77,
        },
        "sdg_tags": [
            "good_health_well_being",
            "quality_education",
            "reduced_inequalities",
            "peace_justice_strong_institutions",
        ],
        "narrative_markdown": _demo_markdown(
            why="사람 문제는 늘 애매하다고만 말하지만, 질문 구조를 잘 만들면 훨씬 더 빨리 핵심 신호를 볼 수 있다고 믿습니다.",
            role="리서치-데이터-AI 역할로 질문 구조와 해석 프레임을 설계하고 싶습니다.",
            contribution="질문 설계, 리서치 요약, 데이터 기반 패턴화, 정성 신호를 구조화하는 일을 줄 수 있습니다.",
            teammate="사용자 문제를 집요하게 보는 PM과, 그걸 실제 제품으로 구현할 백엔드/프론트 오너를 찾고 있습니다.",
            collaboration="가설을 세우고 인터뷰로 검증한 뒤, 근거를 문서로 남기는 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "팀빌딩이나 자기소개처럼 짧은 접점에서 중요한 판단이 내려지는 장면이 늘 아쉬웠습니다.",
            "질문을 잘 설계하는 역할과, 그 결과를 제품으로 묶어내는 역할이 함께 가야 진짜 힘이 난다고 생각합니다.",
            "대화 몇 번만으로도 문제의식과 협업 스타일을 더 빨리 읽어낼 수 있게 되면 충분히 의미 있다고 느낄 것 같습니다.",
        ),
    },
    "taeho.fullstack@example.com": {
        "problem_statement": "작은 팀이 일주일 단위로 실험하고 회고할 수 있는 빌더 대시보드 만들기",
        "mbti": "ENTP-A",
        "mbti_axis_values": {
            "mind": 26,
            "energy": 63,
            "nature": 35,
            "tactics": 24,
            "identity": 31,
        },
        "sdg_tags": [
            "climate_action",
            "decent_work_economic_growth",
            "industry_innovation_infrastructure",
            "responsible_consumption_production",
        ],
        "narrative_markdown": _demo_markdown(
            why="좋은 팀도 실행 리듬이 없으면 흐려지기 쉬워서, 실험과 회고를 붙잡는 도구를 만들고 싶습니다.",
            role="풀스택 빌더로 빠르게 데모를 띄우고 피드백 루프를 닫는 역할을 맡고 싶습니다.",
            contribution="React, Supabase, Docker, 빠른 프로토타이핑과 데모 제작 속도를 줄 수 있습니다.",
            teammate="문제를 자르는 PM과, 안정적인 데이터/백엔드 기반을 만들 사람과 함께하고 싶습니다.",
            collaboration="오늘 만들고 내일 피드백 받는 템포가 잘 맞고, 느린 합의만 반복하는 협업은 피하고 싶습니다.",
        ),
        "history": _demo_history(
            "아이디어보다 반복 리듬이 더 중요하다는 걸 느낀 뒤부터, 그 리듬 자체를 돕는 제품을 만들고 싶어졌습니다.",
            "문제를 자르는 사람과 구현을 받쳐주는 사람이 동시에 있을 때, 저는 가장 빠르게 움직일 수 있습니다.",
            "매주 실험 하나와 회고 하나를 놓치지 않는 팀을 만들 수 있다면 이 문제를 잘 푼 것 같습니다.",
        ),
    },
    "soyeon.mission@example.com": {
        "problem_statement": "팀이 갈등 없이 역할과 우선순위를 정렬하도록 돕는 운영 툴 만들기",
        "mbti": "ISFJ-T",
        "mbti_axis_values": {
            "mind": 75,
            "energy": 29,
            "nature": 69,
            "tactics": 72,
            "identity": 78,
        },
        "sdg_tags": [
            "reduced_inequalities",
            "quality_education",
            "sustainable_cities_communities",
            "clean_water_sanitation",
        ],
        "narrative_markdown": _demo_markdown(
            why="작은 팀에서는 갈등이 생긴 뒤 수습하는 것보다, 역할과 기대를 먼저 정렬하는 게 훨씬 중요하다고 느낍니다.",
            role="운영형 PM 으로 일정, 우선순위, 팀 약속을 명확하게 관리하는 역할을 맡고 싶습니다.",
            contribution="운영 설계, 합의 정리, 회의 구조화, 지표 추적과 문서 관리 역량을 줄 수 있습니다.",
            teammate="실행 오너십이 분명하고, 사용자를 향한 약속을 가볍게 여기지 않는 사람과 먼저 이야기하고 싶습니다.",
            collaboration="회의는 짧고 약속은 구체적인 협업이 잘 맞습니다. 책임이 흐려지는 협업은 피하고 싶습니다.",
        ),
        "history": _demo_history(
            "좋은 사람끼리도 역할 정렬이 안 되면 금방 어긋나는 장면을 많이 봐서, 이 문제를 풀고 싶습니다.",
            "운영을 맡는 사람과 제품을 밀어붙이는 빌더 역할이 서로 존중하는 조합이어야 꼭 맞습니다.",
            "팀이 갈등을 오래 끌지 않고도 우선순위를 빠르게 맞출 수 있다면 충분히 잘 푼 문제라고 생각합니다.",
        ),
    },
    "nari.pm@example.com": {
        "problem_statement": "사람이 자기 문제의식과 성장 방향을 더 선명하게 말하게 돕는 팀빌딩 질문 구조 만들기",
        "mbti": "ENFP-T",
        "mbti_axis_values": {
            "mind": 28,
            "energy": 72,
            "nature": 69,
            "tactics": 34,
            "identity": 76,
        },
        "sdg_tags": [
            "quality_education",
            "reduced_inequalities",
            "good_health_well_being",
            "partnerships_for_the_goals",
        ],
        "narrative_markdown": _demo_markdown(
            why="짧은 소개만으로는 사람의 문제의식이 너무 평평하게 보일 때가 많아서, 더 좋은 질문 구조를 직접 만들고 싶습니다.",
            role="PM으로 문제 framing, 질문 구조, 유저 인터뷰와 우선순위 정리를 맡고 싶습니다.",
            contribution="문제 정의, 질문 설계, 인터뷰 운영, 문서화와 회고 구조를 팀에 줄 수 있습니다.",
            teammate="백엔드나 AI 오너처럼 구조를 구현할 수 있고, 사람 문제를 가볍게 보지 않는 사람과 먼저 대화하고 싶습니다.",
            collaboration="질문을 통해 배운 걸 바로 제품에 반영하는 빠른 학습형 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "사람이 자기 문제를 더 잘 말하게 도와주는 질문 하나가 팀빌딩 경험 전체를 바꿀 수 있다고 느꼈습니다.",
            "저는 문제와 대화 구조를 잡고, 구현 오너는 그 흐름을 실제 제품으로 연결해주는 조합이 가장 좋습니다.",
            "대화를 시작하기 전부터 서로의 문제의식이 더 잘 보이면 충분히 의미 있는 결과라고 생각합니다.",
        ),
    },
    "seungwoo.backend@example.com": {
        "problem_statement": "팀빌딩과 초기 협업에 필요한 질문·응답·추천 흐름을 안정적으로 저장하는 백엔드 플랫폼 만들기",
        "mbti": "ISTJ-A",
        "mbti_axis_values": {
            "mind": 79,
            "energy": 31,
            "nature": 37,
            "tactics": 74,
            "identity": 24,
        },
        "sdg_tags": [
            "industry_innovation_infrastructure",
            "decent_work_economic_growth",
            "quality_education",
            "partnerships_for_the_goals",
        ],
        "narrative_markdown": _demo_markdown(
            why="좋은 대화 흐름도 저장 구조와 운영 안정성이 없으면 오래 못 간다는 걸 자주 경험했습니다.",
            role="백엔드/인프라 오너로 데이터 모델, API, 저장 안정성과 운영 구조를 책임지고 싶습니다.",
            contribution="FastAPI, Postgres, 배포 자동화, 로그 기반 문제 추적과 운영 안정성을 바로 줄 수 있습니다.",
            teammate="문제를 선명하게 자르는 PM과 사용자 경험을 세밀하게 보는 프론트/디자인 오너를 만나고 싶습니다.",
            collaboration="작게 배포하고 로그와 회고로 빠르게 정리하는 협업이 가장 잘 맞습니다.",
        ),
        "history": _demo_history(
            "좋은 팀도 운영 구조가 없으면 금방 버거워지는 걸 봐서, 이 문제를 백엔드 쪽에서 풀고 싶습니다.",
            "문제 우선순위를 잘 자르는 PM과 구현의 첫 인상을 맡는 프론트 오너가 함께 있을 때 제 역할이 제일 분명해집니다.",
            "실험이 늘어나도 저장과 운영이 흔들리지 않는 구조를 만들면 잘 풀었다고 느낄 것 같습니다.",
        ),
    },
    "yubin.ai@example.com": {
        "problem_statement": "짧은 자기소개와 인터뷰 답변에서 문제의식·역할·협업 신호를 뽑아주는 AI 분석 레이어 만들기",
        "mbti": "INFP-T",
        "mbti_axis_values": {
            "mind": 73,
            "energy": 67,
            "nature": 76,
            "tactics": 36,
            "identity": 78,
        },
        "sdg_tags": [
            "good_health_well_being",
            "quality_education",
            "reduced_inequalities",
            "industry_innovation_infrastructure",
        ],
        "narrative_markdown": _demo_markdown(
            why="사람의 서사를 너무 쉽게 요약하거나 왜곡하지 않으면서도, 실제 의사결정에 도움 되는 구조화가 가능하다고 믿습니다.",
            role="AI/리서치 오너로 질문-응답 해석, signal extraction, 평가 규칙 설계를 맡고 싶습니다.",
            contribution="LLM 프롬프트 설계, 정성 신호 구조화, fallback 규칙 설계와 검증 루프를 줄 수 있습니다.",
            teammate="문제를 실제 제품 흐름으로 묶을 PM과, 분석 결과를 화면으로 잘 풀어낼 프론트/디자인 동료를 찾고 있습니다.",
            collaboration="성급한 확신보다 해석 가능성을 우선하고, 실제 사용자 반응으로 다시 검증하는 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "사람 문제를 숫자로만 평평하게 만들지 않으면서도, 더 나은 대화 시작은 도울 수 있다고 느껴서 이 문제를 붙잡고 있습니다.",
            "해석 규칙을 잡는 AI/리서치 역할과, 그 결과를 실제 제품 문장으로 바꾸는 PM/디자인 역할이 함께 가야 한다고 생각합니다.",
            "추천이 과장 없이도 대화 시작률을 높여준다면 충분히 잘 풀린 문제라고 느낄 것 같습니다.",
        ),
    },
    "arin.design@example.com": {
        "problem_statement": "처음 보는 사람도 문제의식과 협업 스타일을 빠르게 읽을 수 있는 팀빌딩 카드 UI 만들기",
        "mbti": "ESFP-A",
        "mbti_axis_values": {
            "mind": 22,
            "energy": 39,
            "nature": 72,
            "tactics": 27,
            "identity": 24,
        },
        "sdg_tags": [
            "quality_education",
            "gender_equality",
            "reduced_inequalities",
            "sustainable_cities_communities",
        ],
        "narrative_markdown": _demo_markdown(
            why="정보는 많아도 읽고 싶지 않은 화면이면 결국 팀빌딩에서 잘 쓰이지 않는다는 걸 여러 번 느꼈습니다.",
            role="디자인/프론트 오너로 카드 구조, 정보 계층, 모바일 경험과 첫 인상을 맡고 싶습니다.",
            contribution="UI 구조화, 인터랙션 설계, React 구현, 정보 밀도 조절 능력을 팀에 줄 수 있습니다.",
            teammate="문제를 구체적으로 잡는 PM과, 저장 구조를 안정적으로 만드는 백엔드가 있는 팀을 선호합니다.",
            collaboration="거친 가설을 빠르게 시안으로 바꾸고, 피드백 보고 바로 고치는 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "사람을 만나는 도구일수록 첫 화면의 정보 구조가 훨씬 중요하다고 느껴서, 이 문제를 직접 다루고 싶습니다.",
            "문제 정의를 자르는 PM, 구조를 받치는 백엔드, 그리고 제가 UI 를 맡는 조합이 가장 잘 맞습니다.",
            "사람들이 카드 몇 장만 봐도 누구와 먼저 얘기해볼지 감이 잡히면 잘 풀었다고 느낄 것 같습니다.",
        ),
    },
    "donghyun.ops@example.com": {
        "problem_statement": "짧은 프로젝트에서도 팀 약속과 협업 리듬을 빠르게 맞추게 돕는 운영 플레이북 만들기",
        "mbti": "ESTJ-T",
        "mbti_axis_values": {
            "mind": 32,
            "energy": 29,
            "nature": 26,
            "tactics": 76,
            "identity": 73,
        },
        "sdg_tags": [
            "partnerships_for_the_goals",
            "sustainable_cities_communities",
            "quality_education",
            "reduced_inequalities",
        ],
        "narrative_markdown": _demo_markdown(
            why="좋은 사람끼리도 협업 약속이 먼저 안 잡히면 금방 엇갈리는 걸 많이 봐서, 운영 플레이북이 필요하다고 느낍니다.",
            role="운영/PM 역할로 일정, 회의 구조, 우선순위 합의와 실행 리듬을 관리하고 싶습니다.",
            contribution="문서 템플릿, 회고 구조, 실행 체크리스트, 팀 약속을 실제 운영 리듬으로 붙이는 역량을 줄 수 있습니다.",
            teammate="혼자만 잘하는 사람보다 팀 약속을 같이 지키는 빌더와 먼저 이야기해보고 싶습니다.",
            collaboration="회의는 짧고, 책임은 분명하고, 다음 행동이 바로 남는 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "짧은 프로젝트일수록 운영 구조가 더 먼저 필요하다는 걸 체감해서 이 문제를 풀고 싶습니다.",
            "저는 운영 리듬을 잡고, 빌더는 구현을 밀어붙이는 역할 분담이 가장 건강하다고 생각합니다.",
            "초반 1주 안에 팀 약속과 리듬이 정리되면 이 문제를 꽤 잘 푼 것이라고 느낄 것 같습니다.",
        ),
    },
    "hyunseo.fullstack@example.com": {
        "problem_statement": "대화 시작 이후 실제 팀 결성까지 이어지는 전환 데이터를 보는 팀빌딩 실험 대시보드 만들기",
        "mbti": "ENTJ-A",
        "mbti_axis_values": {
            "mind": 27,
            "energy": 61,
            "nature": 29,
            "tactics": 68,
            "identity": 25,
        },
        "sdg_tags": [
            "industry_innovation_infrastructure",
            "quality_education",
            "decent_work_economic_growth",
            "responsible_consumption_production",
        ],
        "narrative_markdown": _demo_markdown(
            why="추천이 실제로 도움이 됐는지는 대화 시작 이후 데이터를 봐야 알 수 있어서, 그 전환 구간을 측정하는 도구를 만들고 싶습니다.",
            role="풀스택/데이터 빌더로 실험 대시보드, 이벤트 수집, 전환 시각화를 맡고 싶습니다.",
            contribution="프론트 구현, 백엔드 연결, 실험 로그 설계, 데이터 대시보드와 빠른 MVP 제작 속도를 줄 수 있습니다.",
            teammate="문제를 선명하게 정의하는 PM과, AI/리서치로 신호 해석을 보완해줄 사람과 같이 일하고 싶습니다.",
            collaboration="가설을 세우고, 바로 계측하고, 다음 주에 다시 바꾸는 실험형 협업이 잘 맞습니다.",
        ),
        "history": _demo_history(
            "추천이 예뻐 보이는 것보다 실제로 대화가 더 잘 시작되는지가 더 중요해서, 이 전환 데이터를 보고 싶습니다.",
            "저는 대시보드와 계측을 만들고, PM이나 AI 쪽에서 해석과 방향을 같이 잡아주는 조합을 선호합니다.",
            "추천 이후 실제 대화 전환율과 팀 결성까지의 흐름을 볼 수 있게 되면 충분히 잘 푼 문제라고 생각합니다.",
        ),
    },
}


def _profile_payload(profile_seed: dict[str, object]) -> TeamfitProfileUpsertRequest:
    return TeamfitProfileUpsertRequest(**profile_seed)


def _embed_profile_payload(payload: TeamfitProfileUpsertRequest) -> tuple[str, list[float]]:
    embedding_input = _build_embedding_input(payload)
    embedding = embed_text(
        embedding_input,
        allow_fallback_on_error=True,
        prefer_remote=False,
    )
    return embedding_input, embedding


def _payload_from_profile(profile: TeamfitProfile) -> TeamfitProfileUpsertRequest:
    return TeamfitProfileUpsertRequest(
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
        mbti_axis_values=profile.mbti_axis_values,
        one_liner=profile.one_liner,
    )


def _profile_has_complete_mbti_signals(profile: TeamfitProfile) -> bool:
    compact_mbti = (profile.mbti or "").strip().upper().replace("-", "")
    axis_values = profile.mbti_axis_values or {}
    if len(compact_mbti) != len(MBTI_AXIS_IDS):
        return False

    for axis_id in MBTI_AXIS_IDS:
        raw_value = axis_values.get(axis_id)
        if raw_value is None:
            return False
        try:
            axis_value = int(raw_value)
        except (TypeError, ValueError):
            return False
        if axis_value < 0 or axis_value > 100 or axis_value == 50:
            return False

    return True


def _profile_has_complete_sdg_signals(profile: TeamfitProfile) -> bool:
    impact_tags = list(profile.impact_tags or [])
    return len(impact_tags) == 4 and all(tag in SDG_TAG_IDS for tag in impact_tags)


def _should_backfill_demo_one_liner(profile: TeamfitProfile) -> bool:
    one_liner = (profile.one_liner or "").strip()
    return not one_liner or one_liner in LEGACY_DEMO_ONE_LINERS


def _create_demo_teamfit_profile(db: Session, *, user_id: int, profile_seed: dict[str, object]) -> None:
    payload = _profile_payload(profile_seed)
    embedding_input, embedding = _embed_profile_payload(payload)

    profile = TeamfitProfile(user_id=user_id)
    db.add(profile)

    profile.status = "active"
    profile.completion_stage = payload.completion_stage
    profile.preferred_role = payload.preferred_role
    profile.working_style = payload.working_style
    profile.commitment_pace = payload.commitment_pace
    profile.interests = payload.interests
    profile.problem_focus = payload.problem_focus
    profile.domains = payload.domains
    profile.tech_stack = payload.tech_stack
    profile.impact_tags = payload.impact_tags
    profile.mbti = payload.mbti
    profile.mbti_axis_values = payload.mbti_axis_values
    profile.one_liner = payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, user_id, embedding)


def _sync_demo_profile_signals(db: Session, *, profile: TeamfitProfile, profile_seed: dict[str, object]) -> None:
    needs_signal_backfill = not (
        _profile_has_complete_mbti_signals(profile) and _profile_has_complete_sdg_signals(profile)
    )
    needs_one_liner_backfill = _should_backfill_demo_one_liner(profile)

    if not needs_signal_backfill and not needs_one_liner_backfill:
        return

    seed_payload = _profile_payload(profile_seed)
    updates: dict[str, object] = {}
    if needs_signal_backfill:
        updates.update(
            {
                "completion_stage": seed_payload.completion_stage,
                "impact_tags": seed_payload.impact_tags,
                "mbti": seed_payload.mbti,
                "mbti_axis_values": seed_payload.mbti_axis_values,
            }
        )
    if needs_one_liner_backfill:
        updates["one_liner"] = seed_payload.one_liner

    merged_payload = _payload_from_profile(profile).model_copy(update=updates)
    embedding_input, embedding = _embed_profile_payload(merged_payload)

    profile.status = "active"
    if needs_signal_backfill:
        profile.completion_stage = merged_payload.completion_stage
        profile.impact_tags = merged_payload.impact_tags
        profile.mbti = merged_payload.mbti
        profile.mbti_axis_values = merged_payload.mbti_axis_values
    if needs_one_liner_backfill:
        profile.one_liner = merged_payload.one_liner
    profile.embedding_input = embedding_input
    profile.embedding_json = embedding

    db.flush()
    sync_pgvector_embedding(db, profile.user_id, embedding)


def _sync_demo_explorer_profile(
    db: Session,
    *,
    user_id: int,
    explorer_seed: dict[str, object],
) -> None:
    profile = db.get(TeamfitExplorerProfile, user_id)
    if profile is None:
        profile = TeamfitExplorerProfile(user_id=user_id)
        db.add(profile)

    profile.problem_statement = str(explorer_seed["problem_statement"])
    profile.mbti = str(explorer_seed["mbti"])
    profile.mbti_axis_values = dict(explorer_seed["mbti_axis_values"])
    profile.sdg_tags = list(explorer_seed["sdg_tags"])
    profile.narrative_markdown = str(explorer_seed["narrative_markdown"])

    db.execute(delete(TeamfitExplorerTurn).where(TeamfitExplorerTurn.user_id == user_id))

    history = list(explorer_seed["history"])
    for index, turn_seed in enumerate(history, start=1):
        db.add(
            TeamfitExplorerTurn(
                user_id=user_id,
                sequence_no=index,
                phase=str(turn_seed.get("phase", "initial")),
                question=str(turn_seed["question"]),
                answer=str(turn_seed["answer"]),
            )
        )

    db.flush()
    turns = list(
        db.scalars(
            select(TeamfitExplorerTurn)
            .where(TeamfitExplorerTurn.user_id == user_id)
            .order_by(TeamfitExplorerTurn.sequence_no.asc(), TeamfitExplorerTurn.id.asc())
        ).all()
    )
    signals = _fallback_extract_signals(
        problem_statement=profile.problem_statement,
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
        embedding_input,
        allow_fallback_on_error=True,
        prefer_remote=False,
    )
    profile.extraction_version = EXTRACTION_VERSION
    profile.extracted_at = datetime.now(timezone.utc)


def sync_teamfit_demo_seed(db: Session) -> None:
    if os.getenv("TEAMFIT_DEMO_SEED_ENABLED", "true").lower() in {"0", "false", "no"}:
        return

    for entry in DEMO_TEAMFIT_USERS:
        user = db.scalar(select(User).where(User.email == entry["email"]))
        if user is None:
            user = User(
                email=entry["email"],
                password_hash=hash_password(entry["password"]),
                is_verified=True,
                is_admin=False,
                name=entry["name"],
                github_address=entry["github_address"],
                notion_url=entry["notion_url"],
                applicant_status=entry["applicant_status"],
            )
            db.add(user)
            db.flush()
        else:
            user.is_verified = True
            user.name = entry["name"]
            user.github_address = entry["github_address"]
            user.notion_url = entry["notion_url"]
            user.applicant_status = entry["applicant_status"]

        profile = db.get(TeamfitProfile, user.user_id)
        if profile is not None:
            _sync_demo_profile_signals(db, profile=profile, profile_seed=entry["profile"])
        else:
            _create_demo_teamfit_profile(db, user_id=user.user_id, profile_seed=entry["profile"])

        explorer_seed = DEMO_EXPLORER_PROFILES.get(entry["email"])
        if explorer_seed is not None:
            _sync_demo_explorer_profile(db, user_id=user.user_id, explorer_seed=explorer_seed)

    db.commit()
