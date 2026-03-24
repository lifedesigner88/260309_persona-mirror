"""Demo seed — inserts parksejong user + Hupository persona on every startup (idempotent)."""
from __future__ import annotations

import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User
from app.features.persona.models import Persona

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "lifedesigner88@gmail.com")
DEMO_USER_PIN   = os.getenv("DEMO_USER_PIN",   "1234")                 # login: email + 1234
DEMO_PERSONA_ID = os.getenv("DEMO_PERSONA_ID", "sejong")               # /persona/sejong
DEMO_PERSONA_TITLE = "세종 페르소나 · Team-Up Profile"

_DATA_ENG: dict = {
    "archetype": "Founder-Minded Educator-Builder",
    "headline": "Founder-minded developer who turns education, community, and AI into real products",
    "mbti": {
        "type": "INFJ",
        "identity": "T",
        "scores": {
            "introverted": 74,
            "intuitive": 88,
            "feeling": 58,
            "judging": 78,
            "turbulent": 67,
        },
    },
    "one_liner": (
        "An educator-builder who has run communities, taught math, ranked first in a "
        "bootcamp project, and shipped a solo product. In SoMa, he wants to spend June "
        "through November building one serious product with teammates in AI, edtech, or "
        "a neighboring life-design space."
    ),
    "top3_values": ["Life Design", "Growth & Learning", "Education x Technology"],
    "strengths": [
        "Translates education and community experience into clear product opportunities",
        "Has shipped a live solo product end to end, from planning to deployment",
        "Strong documentation and reflection habits keep teams aligned and learning fast",
        "Brings both teacher empathy and operator discipline to product decisions",
    ],
    "watchouts": [
        "Can lose focus if the team keeps too many ideas alive at once",
        "Works best when scope, role split, and priorities are clarified early",
        "Tends to go very deep on meaningful problems, which can slow lightweight experiments",
        "Because founder energy is strong, he needs teammates who challenge decisions directly and early",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "Keep hold of the question of how to design a life, and help more people "
            "learn, work, and grow with greater intention through technology and education."
        ),
        "current_decade_mission": (
            "Build products at the intersection of education, AI, and life design that "
            "people will actually pay for, validate the goal of starting up and earning "
            "revenue in dollars, and use SoMa as a six-month stretch to go deep with one "
            "serious team."
        ),
        "long_term_vision": (
            "Start in Korea, then build globally relevant products that help people learn "
            "and design their lives better, eventually becoming a founder with durable dollar revenue."
        ),
        "long_term_directions": [
            "AI agent and coaching products for learning and life design",
            "Edtech products with strong community and documentation DNA",
            "Small, strong founder-style teams that can ship from planning to launch",
            "Korean validation first, then global expansion and dollar revenue",
        ],
    },
    "team_up": {
        "pitch": (
            "Looking for a serious three-person SoMa team that wants to validate one product, "
            "ship consistently, and seriously test startup potential instead of stopping at a demo."
        ),
        "availability": (
            "Open to committing to one aligned team from June through November if the domain "
            "is adjacent to AI, edtech, coaching, creator tools, or life-design products."
        ),
        "target_domains": [
            "AI products that reduce real learning, career, or self-management friction",
            "Edtech or learning workflow tools that users may actually pay for",
            "Coaching, creator, or knowledge products with strong retention loops",
            "Adjacent product spaces where education, community, and AI can create clear user value",
        ],
        "what_i_bring": [
            "Founder-style ownership from problem framing to launch",
            "Full-stack product building across Python, TypeScript, React, Spring, Supabase, and cloud infra",
            "Strong documentation, reflection, and operating rhythm for small teams",
            "Real user empathy from years in education and community operations",
            "A strong desire to turn experiments into revenue, including global dollar revenue",
        ],
        "looking_for": [
            "Teammates who want to build one product deeply rather than chase too many ideas",
            "People who care about execution speed, user value, and eventual revenue",
            "Builders who communicate honestly, document decisions, and improve every week",
            "Product, design, AI, frontend, or growth partners who want to complement a founder-minded generalist",
        ],
    },
    "tech_stack": [
        {"name": "python",              "category": "Language",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"},
        {"name": "fastapi",             "category": "Backend",   "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"},
        {"name": "LangGraph",           "category": "AI",        "icon_url": "/langgraph-mark.svg"},
        {"name": "typescript",          "category": "Language",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"},
        {"name": "java",                "category": "Language",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg"},
        {"name": "react",               "category": "Frontend",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"},
        {"name": "React Router v7",     "category": "Full-stack", "icon_url": "https://cdn.simpleicons.org/reactrouter/CA4245"},
        {"name": "vue.js",              "category": "Frontend",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg"},
        {"name": "spring",              "category": "Backend",   "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg"},
        {"name": "supabase",            "category": "Service",   "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg"},
        {"name": "redis",               "category": "Database",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg"},
        {"name": "postgresql",          "category": "Database",  "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"},
        {"name": "docker",              "category": "Infra",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"},
        {"name": "AmazonWebServices",   "category": "Infra",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg"},
        {"name": "ubuntu",              "category": "Infra",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-original.svg"},
        {"name": "github actions",      "category": "Infra",     "icon_url": "https://cdn.simpleicons.org/githubactions/2088FF"},
    ],
    "fit_vectors": {
        "learning_drive": 5,
        "teaching_drive": 5,
        "community_drive": 5,
        "builder_drive": 5,
        "scientific_curiosity": 5,
        "entrepreneurship": 5,
        "reflection_depth": 5,
    },
    "sdg_alignment": [
        {"sdg": 4,  "label": "Quality Education",              "resonance": "high"},
        {"sdg": 8,  "label": "Decent Work and Economic Growth", "resonance": "high"},
        {"sdg": 10, "label": "Reduced Inequalities",            "resonance": "medium"},
        {"sdg": 17, "label": "Partnerships for the Goals",      "resonance": "medium"},
    ],
    "identity_shifts": [
        {
            "period": "2011",
            "label": "Life Designer declaration",
            "note": (
                "Publicly declared the identity 'Life Designer' and committed to designing "
                "a life around growth, intention, and helping others do the same."
            ),
        },
        {
            "period": "2015–2019",
            "label": "Global community PM",
            "note": (
                "Operated international camps across 12 countries and learned how to plan, "
                "coordinate, and carry responsibility for people-centered programs."
            ),
        },
        {
            "period": "2023–2024",
            "label": "Educator to developer pivot",
            "note": (
                "Completed a software bootcamp with 120 days of perfect attendance, helped "
                "take a team project to first place, and proved he could translate learning speed into shipping."
            ),
        },
        {
            "period": "2025–2026",
            "label": "Solo founder to team-ready builder",
            "note": (
                "Launched SejongClass as a solo product, started shipping AI prototypes, and "
                "is now looking for a serious team to push one product deeply through SoMa."
            ),
        },
    ],
}

_DATA_KOR: dict = {
    "archetype": "창업형 교육자-빌더",
    "headline": "교육, 커뮤니티, AI를 실제 제품으로 연결하는 창업형 개발자",
    "mbti": {
        "type": "INFJ",
        "identity": "T",
        "scores": {
            "introverted": 74,
            "intuitive": 88,
            "feeling": 58,
            "judging": 78,
            "turbulent": 67,
        },
    },
    "one_liner": (
        "커뮤니티 운영, 수학 교육, 부트캠프 1위 프로젝트, 1인 서비스 런칭까지 해본 "
        "교육자형 빌더. 소마에서는 AI, 에듀테크, 라이프디자인 계열 팀과 6월부터 11월까지 "
        "한 제품을 깊게 만들고 싶습니다."
    ),
    "top3_values": ["라이프디자인", "성장과 학습", "교육 x 기술"],
    "strengths": [
        "교육과 커뮤니티 경험을 제품 기회로 번역할 수 있습니다.",
        "기획부터 개발, 배포까지 1인으로 실제 서비스를 끝까지 밀어본 경험이 있습니다.",
        "기록과 회고 습관이 강해서 팀의 정렬과 학습 속도를 높일 수 있습니다.",
        "교육자 관점의 공감 능력과 운영자의 실행 감각을 함께 갖추고 있습니다.",
    ],
    "watchouts": [
        "팀이 여러 아이디어를 동시에 들고 가면 집중력이 흐려질 수 있습니다.",
        "초기에 스코프, 역할 분담, 우선순위가 선명할수록 훨씬 더 잘 움직입니다.",
        "중요하다고 느끼는 문제는 깊게 파는 편이라 가벼운 실험 속도가 느려질 수 있습니다.",
        "창업자 성향이 강해서 초반부터 직설적으로 피드백을 주는 팀원이 필요합니다.",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "삶을 어떻게 설계할 것인가라는 질문을 붙들고, 기술과 교육을 통해 "
            "더 많은 사람이 더 의도적으로 배우고 일하고 성장하도록 돕고자 합니다."
        ),
        "current_decade_mission": (
            "교육, AI, 라이프디자인이 만나는 지점에서 사람들이 실제로 돈을 내는 제품을 만들고, "
            "'창업해서 달러 벌기'라는 목표를 검증하고자 합니다. 소마에서는 6개월 동안 한 팀과 한 제품을 깊게 밀어붙이고 싶습니다."
        ),
        "long_term_vision": (
            "한국에서 시작해 글로벌하게 통하는 학습/라이프디자인 제품을 만들고, "
            "지속 가능한 달러 매출을 만드는 창업가가 되고자 합니다."
        ),
        "long_term_directions": [
            "학습과 라이프디자인을 위한 AI 에이전트/코칭 제품",
            "커뮤니티와 기록 문화가 살아 있는 에듀테크 제품",
            "기획부터 출시까지 밀어붙일 수 있는 소수 정예 창업형 팀",
            "국내 검증 이후 글로벌 확장과 달러 매출 전개",
        ],
    },
    "team_up": {
        "pitch": (
            "데모로 끝나는 팀보다, 한 제품을 검증하고 꾸준히 출시하면서 실제 창업 가능성까지 테스트하려는 "
            "소마 3인 팀을 찾고 있습니다."
        ),
        "availability": (
            "AI, 에듀테크, 코칭, 크리에이터 툴, 라이프디자인과 맞닿아 있는 도메인이라면 "
            "6월부터 11월까지 한 팀으로 깊게 일할 의향이 있습니다."
        ),
        "target_domains": [
            "학습, 커리어, 자기관리의 실제 불편을 줄이는 AI 제품",
            "사용자가 실제로 돈을 낼 수 있는 에듀테크/학습 워크플로우 도구",
            "리텐션이 살아 있는 코칭, 크리에이터, 지식형 제품",
            "교육, 커뮤니티, AI를 결합해 분명한 사용자 가치를 만들 수 있는 인접 도메인",
        ],
        "what_i_bring": [
            "문제 정의부터 출시까지 가져가는 창업자형 오너십",
            "Python, TypeScript, React, Spring, Supabase, 클라우드 인프라까지 이어지는 풀스택 빌딩 역량",
            "작은 팀의 정렬을 도와주는 문서화, 회고, 운영 리듬",
            "교육과 커뮤니티 현장에서 쌓인 실제 사용자 공감력",
            "실험을 매출로 연결하고 결국 달러 매출까지 만들고 싶은 강한 방향성",
        ],
        "looking_for": [
            "아이디어를 여러 개 벌리기보다 한 제품을 깊게 만드는 팀원",
            "실행 속도, 사용자 가치, 그리고 매출 가능성을 함께 보는 사람",
            "솔직하게 소통하고, 기록하고, 매주 더 나아지려는 빌더",
            "창업형 제너럴리스트인 저를 보완해줄 프로덕트, 디자인, AI, 프론트, 성장 파트너",
        ],
    },
    "tech_stack": [
        {"name": "python",              "category": "언어",       "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg"},
        {"name": "fastapi",             "category": "백엔드",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg"},
        {"name": "LangGraph",           "category": "AI",        "icon_url": "/langgraph-mark.svg"},
        {"name": "typescript",          "category": "언어",       "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg"},
        {"name": "java",                "category": "언어",       "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg"},
        {"name": "react",               "category": "프론트엔드", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg"},
        {"name": "React Router v7",     "category": "풀스택",     "icon_url": "https://cdn.simpleicons.org/reactrouter/CA4245"},
        {"name": "vue.js",              "category": "프론트엔드", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg"},
        {"name": "spring",              "category": "백엔드",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg"},
        {"name": "supabase",            "category": "서비스",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg"},
        {"name": "redis",               "category": "데이터베이스", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg"},
        {"name": "postgresql",          "category": "데이터베이스", "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg"},
        {"name": "docker",              "category": "인프라",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg"},
        {"name": "AmazonWebServices",   "category": "인프라",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg"},
        {"name": "ubuntu",              "category": "인프라",     "icon_url": "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-original.svg"},
        {"name": "github actions",      "category": "인프라",     "icon_url": "https://cdn.simpleicons.org/githubactions/2088FF"},
    ],
    "fit_vectors": {
        "learning_drive": 5,
        "teaching_drive": 5,
        "community_drive": 5,
        "builder_drive": 5,
        "scientific_curiosity": 5,
        "entrepreneurship": 5,
        "reflection_depth": 5,
    },
    "sdg_alignment": [
        {"sdg": 4,  "label": "양질의 교육",              "resonance": "high"},
        {"sdg": 8,  "label": "양질의 일자리와 경제 성장", "resonance": "high"},
        {"sdg": 10, "label": "불평등 감소",               "resonance": "medium"},
        {"sdg": 17, "label": "목표 달성을 위한 파트너십", "resonance": "medium"},
    ],
    "identity_shifts": [
        {
            "period": "2011",
            "label": "라이프디자이너 선언",
            "note": (
                "'라이프디자이너'라는 정체성을 공개 선언하고, 성장과 의도를 중심에 둔 삶의 방향을 분명히 했습니다."
            ),
        },
        {
            "period": "2015–2019",
            "label": "국제 커뮤니티 PM",
            "note": (
                "12개국이 참여하는 국제캠프를 운영하며 사람 중심 프로그램 기획과 운영 책임을 몸으로 익혔습니다."
            ),
        },
        {
            "period": "2023–2024",
            "label": "교육자에서 개발자로 전환",
            "note": (
                "120일 개근으로 개발 부트캠프를 수료하고, 팀 프로젝트 1위를 경험하며 학습 속도를 실전 결과로 증명했습니다."
            ),
        },
        {
            "period": "2025–2026",
            "label": "1인 창업자에서 팀 빌더 단계로",
            "note": (
                "세종클래스를 직접 런칭하고 AI 프로토타입을 만들기 시작했습니다. 이제 소마에서 한 팀과 한 제품을 깊게 밀어붙일 준비가 되어 있습니다."
            ),
        },
    ],
}


def sync_demo_seed(db: Session) -> None:
    """Insert demo user and persona if they don't exist yet (idempotent)."""
    # ── User ──────────────────────────────────────────────────────────────────
    user = db.scalar(select(User).where(User.email == DEMO_USER_EMAIL))
    if user is None:
        user = User(
            email=DEMO_USER_EMAIL,
            password_hash=hash_password(DEMO_USER_PIN),
            is_verified=True,
            is_admin=False,
            github_address="https://github.com/lifedesigner88",
            notion_url="https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1",
        )
        db.add(user)
        db.flush()  # get user into session before persona FK
    else:
        user.github_address = "https://github.com/lifedesigner88"
        user.notion_url = "https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1"

    # ── Persona ───────────────────────────────────────────────────────────────
    existing = db.scalar(select(Persona).where(Persona.persona_id == DEMO_PERSONA_ID))
    if existing is None:
        db.add(
            Persona(
                persona_id=DEMO_PERSONA_ID,
                user_id=user.user_id,
                title=DEMO_PERSONA_TITLE,
                data_eng=_DATA_ENG,
                data_kor=_DATA_KOR,
            )
        )
    else:
        existing.user_id = user.user_id
        existing.title = DEMO_PERSONA_TITLE
        existing.data_eng = _DATA_ENG
        existing.data_kor = _DATA_KOR

    db.commit()
