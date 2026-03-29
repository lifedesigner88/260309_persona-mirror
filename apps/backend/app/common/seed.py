"""Demo seed — inserts parksejong user + Hupository persona on every startup (idempotent)."""
from __future__ import annotations

import os
from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.security import hash_password
from app.features.auth.models import User
from app.features.persona.models import Persona

DEMO_USER_EMAIL = os.getenv("DEMO_USER_EMAIL", "lifedesigner88@gmail.com")
DEMO_USER_PIN   = os.getenv("DEMO_USER_PIN",   "123456")               # login: email + 123456
DEMO_PERSONA_ID = os.getenv("DEMO_PERSONA_ID", "sejong")               # /persona/sejong
DEMO_PERSONA_TITLE = "박세종 · AI SW Maestro 17 Team Building"
DEMO_USER_NAME = "박세종"
DEMO_USER_GENDER = "M"
DEMO_USER_BIRTH_DATE = date(1988, 9, 12)
DEMO_USER_RESIDENCE = "서울시 은평구"
DEMO_USER_PHONE = os.getenv("DEMO_USER_PHONE")
DEMO_USER_INTERVIEW_DATE = date(2026, 3, 20)
DEMO_USER_INTERVIEW_START_TIME = time(9, 30)
DEMO_USER_INTERVIEW_TIME_SLOT = 1
DEMO_USER_INTERVIEW_ROOM = 1
DEMO_USER_APPLICANT_STATUS = "approved"
DEMO_USER_GITHUB = "https://github.com/lifedesigner88"
DEMO_USER_NOTION = "https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1"

_DATA_ENG: dict = {
    "archetype": "From helping students find jobs to creating jobs myself",
    "headline": (
        "An educator-turned-developer building AI products that help people grow "
        "and help teams get started"
    ),
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
        "An educator-developer who wants to build structures that help people design their own lives."
    ),
    "identity_keywords": [
        "Life Designer",
        "Growth Structure Designer",
        "Education x Technology Builder",
        "Community Planner",
    ],
    "top3_values": ["User Understanding", "Community", "Education x Technology"],
    "strengths": [
        "Strongest in the founder-PM lane: problem framing, user understanding, scope, priorities, and narrative",
        "Turns education, community, and life-design context into product opportunities that feel grounded in real users",
        "Documentation and written thinking make decisions, tradeoffs, and next steps visible to the whole team",
        "Has shipped a solo product before, so discussions usually end in concrete actions rather than vague enthusiasm",
    ],
    "watchouts": [
        "Not the best fit for a team where no one wants clear ownership of backend or the product surface",
        "Works best when scope, role split, and product priorities are clarified early",
        "Needs teammates who challenge ideas with evidence instead of polite silence",
        "If the team keeps too many ideas alive at once, focus and momentum can drop quickly",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "Keep hold of the question of how to design a life, and help more people "
            "learn, work, and grow with greater intention through technology and education."
        ),
        "current_decade_mission": (
            "Use SoMa to prove that a small founder-style team can build a user-facing AI "
            "product around self-introduction, team formation, learning, or life design "
            "that people actually return to and eventually pay for."
        ),
        "long_term_vision": (
            "Start from a narrow but painful user problem in Korea, prove retention and paid "
            "value, then grow into globally relevant products for learning and life design."
        ),
        "long_term_directions": [
            "AI products that help people introduce themselves, understand fit, and start better collaboration",
            "Learning, coaching, and community products with strong documentation and retention loops",
            "Small founder-style teams with crisp owner split instead of blurry generalism",
            "Korea-first validation, then global expansion and durable dollar revenue",
        ],
    },
    "team_up": {
        "pitch": (
            "I am not looking for a loose study group. I am looking for a three-person SoMa "
            "team that can decide fast, ship weekly, and test whether one product deserves to "
            "become a company."
        ),
        "availability": (
            "I want to choose the team before or around the April 3, 2026 networking window, "
            "then commit from June through November to one product with a clear owner split."
        ),
        "target_domains": [
            "Self-introduction and team-building tools that help people understand fit faster",
            "AI products for learning, coaching, or life design with clear repeat use",
            "Community or creator products where trust, clarity, and documentation matter",
            "Any product space where user interviews can shape scope early and sharply",
        ],
        "what_i_bring": [
            "Founder-PM ownership for problem framing, user understanding, direction setting, and documentation",
            "Education and community domain understanding that helps us notice real user pain quickly",
            "Enough implementation literacy across React, FastAPI, AI, and deployment to make grounded decisions with owners",
            "A written operating rhythm that keeps a small team aligned and moving every week",
            "Long-horizon founder intent: I care whether this becomes a real product, not just a polished demo",
        ],
        "looking_for": [
            "A Backend-AI-Infra owner who can own FastAPI, LangGraph, data model, deployment stability, and operations",
            "A Frontend-UX-Product owner who can own first impression, intro flow, card UI, and conversion experience",
            "People who care about user problems more than technology for its own sake",
            "Teammates who communicate honestly and ship all the way to deployment",
        ],
    },
    "creator_pr": {
        "event_badge": "AI SW Maestro 17",
        "event_note": (
            "First goal of this page: help potential teammates quickly understand the team picture "
            "before the April 3, 2026 team-building event."
        ),
        "role_summary": (
            "My strongest lane is Founder-PM: problem framing, user understanding, documentation, and direction setting."
        ),
        "quick_facts": [
            {
                "label": "My role",
                "value": "Founder-PM",
            },
            {
                "label": "Need now",
                "value": "1 Backend-AI-Infra partner + 1 Frontend-UX-Product partner",
            },
            {
                "label": "Team vibe",
                "value": "Not a perfect team from day one, but a small team that can grow while shipping",
            },
        ],
        "teammate_roles": [
            {
                "title": "Backend-AI-Infra owner",
                "summary": (
                    "Someone who wants to own the backend, AI, and infra side with the team."
                ),
                "bullets": [
                    "Can own FastAPI, LangGraph, and the data model",
                    "Will carry deployment, ops, and stability to the end",
                ],
            },
            {
                "title": "Frontend-UX-Product owner",
                "summary": (
                    "Someone who wants to shape the product surface and improve it with users."
                ),
                "bullets": [
                    "Can design and build the intro flow, card UI, and first impression",
                    "Cares about clarity, trust, and mobile readability",
                ],
            },
        ],
        "avoid_matches": [],
        "project": {
            "title": "A product that helps people understand fit faster",
            "summary": (
                "I want us to start from a real moment like team building or self-introduction and make the next decision easier."
            ),
            "bullets": [
                "Start from a painful flow such as self-introduction, fit discovery, or team formation",
                "Use AI to organize messy personal context into something people can actually act on",
                "If it works, grow it from SoMa into a broader product later",
            ],
        },
        "why_now": {
            "title": "Why faster communication matters",
            "summary": (
                "The offline team-building window is short. Sharing context early helps people start better conversations and make faster team decisions."
            ),
            "bullets": [
                "See whom to talk to first before meeting in person",
                "Share role, GitHub, and intro links early",
                "Make the short offline time more useful",
            ],
        },
        "why_me": {
            "title": "What I can own",
            "summary": (
                "I am strongest in the Founder-PM lane: narrowing the problem, understanding users, documenting decisions, and keeping the team moving."
            ),
            "bullets": [
                "I bring strong user and domain intuition from education and community work",
                "I naturally write docs that make decisions and next steps visible",
                "I care about building something real, not only making a polished presentation",
            ],
        },
        "cta": {
            "title": (
                "If you feel close to one of these two roles, I would love to talk before team building."
            ),
            "body": (
                "You do not need to be a finished expert. If you want to take ownership of one side, ship together, and grow through one product, please email me."
            ),
        },
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
    "archetype": "학생들의 취업을 돕다가, 이제는 직접 일자리를 만드는 사람",
    "headline": "교육자에서 개발자로 전환해, 사람의 성장과 팀의 시작을 돕는 AI 제품을 만들고 있습니다.",
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
        "사람들이 자신의 삶을 스스로 설계할 수 있는 구조를 만들고 싶은 교육자형 개발자"
    ),
    "identity_keywords": [
        "라이프디자이너",
        "성장 구조 설계자",
        "교육×기술 빌더",
        "커뮤니티 기획자",
    ],
    "top3_values": ["사용자 이해", "커뮤니티", "교육 x 기술"],
    "strengths": [
        "Founder-PM 포지션에서 문제 정의, 사용자 이해, 우선순위, 제품 서사를 잡는 데 가장 강합니다.",
        "교육, 커뮤니티, 라이프디자인 맥락을 실제 사용자 문제로 번역할 수 있습니다.",
        "문서화와 글쓰기 습관이 강해서 의사결정, 트레이드오프, 다음 액션을 팀에 선명하게 남길 수 있습니다.",
        "혼자 서비스를 런칭해본 경험이 있어서 대화가 추상적으로 끝나지 않고 실행으로 이어집니다.",
    ],
    "watchouts": [
        "백엔드나 제품 화면의 핵심 면을 끝까지 책임질 오너가 없는 팀과는 잘 맞지 않습니다.",
        "초기에 스코프, 역할 분담, 제품 우선순위가 선명할수록 훨씬 더 잘 움직입니다.",
        "아이디어에 대해 근거 있는 반박을 주는 팀원과 잘 맞고, 애매한 동의가 길어지면 비효율이 커집니다.",
        "팀이 여러 방향을 동시에 벌리면 집중력과 추진력이 빠르게 분산될 수 있습니다.",
    ],
    "goals_vision": {
        "lifetime_mission": (
            "삶을 어떻게 설계할 것인가라는 질문을 붙들고, 기술과 교육을 통해 "
            "더 많은 사람이 더 의도적으로 배우고 일하고 성장하도록 돕고자 합니다."
        ),
        "current_decade_mission": (
            "소마 안에서 자기소개, 팀빌딩, 학습, 라이프디자인과 연결되는 사용자용 AI 제품을 만들고, "
            "작지만 창업형인 팀이 실제 리텐션과 결제 가능성을 가진 제품을 만들 수 있는지 검증하고 싶습니다."
        ),
        "long_term_vision": (
            "한국에서 시작해 분명한 사용자 문제를 검증한 뒤, 학습과 라이프디자인 영역에서 "
            "글로벌하게 통하는 제품으로 키우고 지속 가능한 달러 매출을 만드는 창업가가 되고자 합니다."
        ),
        "long_term_directions": [
            "자기소개, 팀 적합도, 협업 시작을 더 잘 돕는 AI 제품",
            "기록 문화와 리텐션이 살아 있는 학습·코칭·커뮤니티 제품",
            "제너럴리즘보다 오너십이 선명한 소수 정예 창업형 팀",
            "국내 검증 이후 글로벌 확장과 달러 매출 전개",
        ],
    },
    "team_up": {
        "pitch": (
            "스터디형 팀이 아니라, 빠르게 결정하고 매주 출시하면서 한 제품이 회사가 될 수 있는지까지 "
            "테스트하려는 소마 3인 팀을 찾고 있습니다."
        ),
        "availability": (
            "2026년 4월 3일 팀빌딩 전후로 팀을 정하고, 6월부터 11월까지 역할이 선명한 한 팀으로 "
            "한 제품을 깊게 만들고 싶습니다."
        ),
        "target_domains": [
            "자기소개와 팀빌딩 과정에서 사람들의 판단을 더 빠르고 선명하게 돕는 제품",
            "학습, 코칭, 라이프디자인 문제를 실제로 반복 사용하게 만드는 AI 제품",
            "신뢰, 명확성, 문서화가 중요한 커뮤니티형 또는 크리에이터형 제품",
            "초기 사용자 인터뷰로 빠르게 문제를 좁힐 수 있는 제품 공간",
        ],
        "what_i_bring": [
            "문제 정의, 사용자 이해, 방향 설정, 문서화까지 가져가는 Founder-PM 오너십",
            "교육과 커뮤니티 현장에서 쌓은 실제 사용자·도메인 이해",
            "React, FastAPI, AI, 배포 흐름을 함께 이해하며 오너들과 현실적인 의사결정을 할 수 있는 구현 감각",
            "작은 팀을 매주 정렬시키는 글쓰기, 문서화, 운영 리듬",
            "예쁜 데모보다 실제 제품 가능성과 창업 가능성을 더 중요하게 보는 방향성",
        ],
        "looking_for": [
            "FastAPI, LangGraph, 데이터모델, 배포 안정화, 운영 책임까지 맡을 Backend-AI-Infra 오너",
            "첫인상, 자기소개 흐름, 카드 UI, 전환 경험을 설계·구현할 Frontend-UX-Product 오너",
            "기술 그 자체보다 사용자 문제를 더 중요하게 보는 사람",
            "말보다 배포와 실제 피드백 루프를 끝까지 가져가는 팀원",
        ],
    },
    "creator_pr": {
        "event_badge": "AI SW Maestro 17",
        "event_note": (
            "이 페이지의 1차 목적은 2026년 4월 3일 팀빌딩 전에 팀 그림을 빠르게 이해하게 만드는 것입니다."
        ),
        "role_summary": (
            "제가 가장 잘하는 역할은 Founder-PM입니다. 문제 정의, 사용자 이해, 문서화, 방향 정리를 맡겠습니다."
        ),
        "quick_facts": [
            {
                "label": "내 역할",
                "value": "Founder-PM",
            },
            {
                "label": "지금 찾는 2명",
                "value": "백엔드 · AI · 인프라 1명 · 프론트엔드 · UX · 프로덕트 1명",
            },
            {
                "label": "팀 분위기",
                "value": "완성형보다 같이 만들고 같이 성장하는 작은 팀",
            },
        ],
        "teammate_roles": [
            {
                "title": "백엔드 · AI · 인프라",
                "summary": (
                    "백엔드·AI·인프라를 주도적으로 맡아 함께 키워갈 사람을 찾습니다."
                ),
                "bullets": [
                    "FastAPI, LangGraph, 데이터 구조를 함께 책임질 사람",
                    "배포와 운영 안정화까지 끝까지 챙길 사람",
                ],
            },
            {
                "title": "프론트엔드 · UX · 프로덕트",
                "summary": (
                    "제품 화면과 사용자 흐름을 직접 만들고 개선해갈 사람을 찾습니다."
                ),
                "bullets": [
                    "React Router v7 기반 흐름을 선호하는 사람",
                    "비주얼뿐 아니라 신뢰감과 모바일 가독성을 중요하게 볼 사람",
                ],
            },
        ],
        "avoid_matches": [],
        "project": {
            "title": "사람과 팀의 fit을 더 빨리 이해하게 만드는 제품",
            "summary": (
                "팀빌딩이나 자기소개처럼 실제 선택이 일어나는 순간을 더 선명하게 만드는 제품을 함께 만들고 싶습니다."
            ),
            "bullets": [
                "자기소개, 팀 적합도 파악, 팀 구성처럼 실제로 불편한 흐름에서 출발합니다.",
                "AI를 쓰더라도 결과가 바로 다음 행동으로 이어져야 합니다.",
                "소마에서 검증되면 이후 더 넓은 제품으로 확장할 수 있습니다.",
            ],
        },
        "why_now": {
            "title": (
                "멘토님의 가치를 아시는 분"
            ),
            "summary": (
                "내 생각보다는 멘토님과 엑스퍼트분들께 배우려는 자세인 팀원 제일 선호."
            ),
            "bullets": [
                "04월 03일 팀빌딩 완료",
                "2026년 창업 학습 기간",
                "2027년 본격 실전 창업",
            ],
        },
        "why_me": {
            "title": "서포트형 리더십",
            "summary": (
                "최종 목표는 출근하고 싶은 일자리를 만드는 것입니다."
            ),
            "bullets": [
                "팀원들이 원하는 역할을 우선 배정합니다.",
                "문제를 푸는 데 필요한 역할은 제가 학습해서 서포트합니다.",
                "국제캠프 PM, 대입 컨설팅 등 실무 감각을 갖고 있습니다.",
            ],
        },
        "cta": {
            "title": "저와 함께 팀을 하고 싶다는 생각이 드셨다면,\n빠르게 이메일로 연락주세요.",
            "body": (
                "최근 만든 것, 맡고 싶은 역할, 함께하고 싶은 이유를 메일로 보내주세요.\n"
                "보내주신 내용은 하나씩 모두 읽어보고,\n"
                "24시간 안에 꼭 답장드리겠습니다.\n"
                "이번에 함께하지 못하더라도 같은 문제의식과 주제에 관심 있는 분으로 기억하겠습니다.\n"
                "이후 비슷한 프로젝트를 진행하게 되면 먼저 연락드리거나 협업을 제안드리겠습니다."
            ),
        },
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
            name=DEMO_USER_NAME,
            gender=DEMO_USER_GENDER,
            birth_date=DEMO_USER_BIRTH_DATE,
            residence=DEMO_USER_RESIDENCE,
            phone=DEMO_USER_PHONE,
            interview_date=DEMO_USER_INTERVIEW_DATE,
            interview_start_time=DEMO_USER_INTERVIEW_START_TIME,
            interview_time_slot=DEMO_USER_INTERVIEW_TIME_SLOT,
            interview_room=DEMO_USER_INTERVIEW_ROOM,
            applicant_status=DEMO_USER_APPLICANT_STATUS,
            github_address=DEMO_USER_GITHUB,
            notion_url=DEMO_USER_NOTION,
        )
        db.add(user)
        db.flush()  # get user into session before persona FK
    else:
        user.is_verified = True
        user.is_admin = False
        user.name = DEMO_USER_NAME
        user.gender = DEMO_USER_GENDER
        user.birth_date = DEMO_USER_BIRTH_DATE
        user.residence = DEMO_USER_RESIDENCE
        if DEMO_USER_PHONE is not None:
            user.phone = DEMO_USER_PHONE
        user.interview_date = DEMO_USER_INTERVIEW_DATE
        user.interview_start_time = DEMO_USER_INTERVIEW_START_TIME
        user.interview_time_slot = DEMO_USER_INTERVIEW_TIME_SLOT
        user.interview_room = DEMO_USER_INTERVIEW_ROOM
        user.applicant_status = DEMO_USER_APPLICANT_STATUS
        user.github_address = DEMO_USER_GITHUB
        user.notion_url = DEMO_USER_NOTION

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
