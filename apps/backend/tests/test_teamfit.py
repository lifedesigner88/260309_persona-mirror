from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.auth.models import User
from app.features.teamfit.service import _finalize_generated_teamfit_question
from app.features.teamfit.models import (
    TeamfitExplorerProfile,
    TeamfitExplorerTurn,
    TeamfitFitCheck,
)

VALID_AXIS_VALUES = {
    "mind": 74,
    "energy": 26,
    "nature": 74,
    "tactics": 26,
    "identity": 74,
}

VALID_HISTORY = [
    {
        "question": "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
        "answer": "팀빌딩 전에 누구와 먼저 이야기해야 할지 더 잘 좁히고 싶습니다.",
    },
    {
        "question": "함께할 팀원을 고를 때 꼭 맞아야 하는 협업 장면은 무엇인가요?",
        "answer": "문제를 명확하게 정의하고 빠르게 작은 실험을 굴릴 수 있어야 합니다.",
    },
    {
        "question": "6개월 뒤 어떤 결과가 나오면 잘 풀었다고 느낄까요?",
        "answer": "후보를 빠르게 좁히고 실제 대화 전환율이 높아졌다고 느끼면 좋겠습니다.",
    },
]


def build_payload(**overrides):
    payload = {
        "problem_statement": "팀빌딩 전에 누구와 먼저 대화해야 할지 더 잘 좁히고 싶습니다.",
        "mbti": "ISFP-T",
        "mbti_axis_values": VALID_AXIS_VALUES,
        "sdg_tags": [
            "quality_education",
            "reduced_inequalities",
            "climate_action",
            "good_health_well_being",
        ],
        "narrative_markdown": (
            "## 왜 이 문제를 풀고 싶나\n"
            "팀빌딩 전에 누구와 먼저 이야기해야 할지 더 잘 좁히고 싶습니다.\n\n"
            "## 내가 팀에서 맡고 싶은 역할\n"
            "PM과 기획 역할을 맡아 문제 정의와 인터뷰 흐름을 설계하고 싶습니다.\n\n"
            "## 내가 줄 수 있는 것\n"
            "문제 정의, 사용자 인터뷰, 실험 설계, 빠른 문서화를 당장 팀에 줄 수 있습니다.\n\n"
            "## 같이 대화해보고 싶은 사람\n"
            "백엔드나 AI 역할이 강하고, 문제를 구조로 풀고 싶은 사람과 먼저 이야기해보고 싶습니다.\n\n"
            "## 잘 맞는 협업 / 피하고 싶은 협업\n"
            "문서로 먼저 정리하고 빠르게 실험하는 협업이 잘 맞습니다. 피하고 싶은 협업은 말만 많고 실행이 없는 방식입니다."
        ),
        "history": VALID_HISTORY,
    }
    payload.update(overrides)
    return payload


def build_structured_payload(
    *,
    problem_statement: str,
    role: str,
    strengths: str,
    wanted_people: str,
    collaboration: str,
    why_now: str,
    sdg_tags: list[str] | None = None,
    mbti: str = "ISFP-T",
):
    return build_payload(
        problem_statement=problem_statement,
        mbti=mbti,
        sdg_tags=sdg_tags
        or [
            "quality_education",
            "reduced_inequalities",
            "good_health_well_being",
            "partnerships_for_the_goals",
        ],
        narrative_markdown=(
            f"## 왜 이 문제를 풀고 싶나\n{why_now}\n\n"
            f"## 내가 팀에서 맡고 싶은 역할\n{role}\n\n"
            f"## 내가 줄 수 있는 것\n{strengths}\n\n"
            f"## 같이 대화해보고 싶은 사람\n{wanted_people}\n\n"
            f"## 잘 맞는 협업 / 피하고 싶은 협업\n{collaboration}"
        ),
    )


def seed_saved_profile(client, signup_user, login_user):
    signup_user(email="teamfit-owner@example.com")
    login_user("teamfit-owner@example.com")
    response = client.put("/team-fit/me", json=build_payload())
    assert response.status_code == 200
    return response


def seed_saved_profile_with_followup_turns(client, signup_user, login_user):
    response = seed_saved_profile(client, signup_user, login_user)
    followup_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={
            "question": "같이 풀 사람에게 꼭 기대하는 태도는 무엇인가요?",
            "answer": "문제를 끝까지 밀고 가면서도 빠르게 실험하는 태도를 기대합니다.",
        },
    )
    assert followup_response.status_code == 200
    return response, followup_response


def update_user(
    email: str,
    *,
    applicant_status: str | None = None,
    name: str | None = None,
    github_address: str | None = None,
    notion_url: str | None = None,
):
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        if applicant_status is not None:
            user.applicant_status = applicant_status
        if name is not None:
            user.name = name
        if github_address is not None:
            user.github_address = github_address
        if notion_url is not None:
            user.notion_url = notion_url
        db.commit()
        db.refresh(user)
        return user.user_id


def seed_recommendation_profile(
    client,
    signup_user,
    login_user,
    *,
    email: str,
    payload: dict,
    applicant_status: str = "approved",
    name: str,
):
    signup_user(email=email)
    user_id = update_user(
        email,
        applicant_status=applicant_status,
        name=name,
        github_address=f"https://github.com/{name.replace(' ', '-').lower()}",
        notion_url=f"https://www.notion.so/{name.replace(' ', '-').lower()}",
    )
    login_user(email)
    response = client.put("/team-fit/me", json=payload)
    assert response.status_code == 200
    client.post("/auth/logout")
    return user_id


def test_teamfit_v2_routes_require_login(client):
    me_response = client.get("/team-fit/me")
    next_question_response = client.post(
        "/team-fit/interview/next-question",
        json=build_payload(history=[]),
    )
    save_response = client.put("/team-fit/me", json=build_payload())
    followup_response = client.post("/team-fit/interview/follow-up")
    followup_answer_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={"question": "추가 질문", "answer": "추가 답변"},
    )
    recommendation_response = client.get("/team-fit/recommendations")
    candidates_response = client.get("/team-fit/candidates")

    assert me_response.status_code == 401
    assert next_question_response.status_code == 401
    assert save_response.status_code == 401
    assert followup_response.status_code == 401
    assert followup_answer_response.status_code == 401
    assert recommendation_response.status_code == 401
    assert candidates_response.status_code == 401


def test_teamfit_next_question_generates_first_question(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="teamfit-question@example.com")
    login_user("teamfit-question@example.com")
    monkeypatch.setattr(
        "app.features.teamfit.service._generate_teamfit_question",
        lambda **_: "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
    )

    response = client.post(
        "/team-fit/interview/next-question", json=build_payload(history=[])
    )

    assert response.status_code == 200
    assert response.json() == {
        "phase": "initial",
        "sequence_no": 1,
        "question": "이 문제를 직접 풀고 싶은 가장 개인적인 이유는 무엇인가요?",
    }


def test_teamfit_next_question_limits_initial_interview_to_three_answers(
    client, signup_user, login_user
):
    signup_user(email="teamfit-limit@example.com")
    login_user("teamfit-limit@example.com")

    response = client.post("/team-fit/interview/next-question", json=build_payload())

    assert response.status_code == 400
    assert "최대 3개" in response.json()["detail"]


def test_teamfit_save_requires_exactly_three_initial_answers(
    client, signup_user, login_user
):
    signup_user(email="teamfit-history-rule@example.com")
    login_user("teamfit-history-rule@example.com")

    response = client.put("/team-fit/me", json=build_payload(history=VALID_HISTORY[:2]))

    assert response.status_code == 400
    assert "정확히 3개" in response.json()["detail"]


def test_teamfit_save_persists_explorer_profile_and_history(
    client, signup_user, login_user
):
    signup_user(email="teamfit-save@example.com")
    login_user("teamfit-save@example.com")

    response = client.put("/team-fit/me", json=build_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["problem_statement"] == build_payload()["problem_statement"]
    assert body["mbti"] == "ISFP-T"
    assert body["sdg_tags"] == [
        "quality_education",
        "reduced_inequalities",
        "climate_action",
        "good_health_well_being",
    ]
    assert len(body["history"]) == 3
    assert body["history"][0]["phase"] == "initial"
    assert body["can_request_followup"] is True

    with SessionLocal() as db:
        profile = db.scalar(select(TeamfitExplorerProfile))
        assert profile is not None
        assert profile.problem_statement == build_payload()["problem_statement"]
        assert profile.extracted_signals_json is not None
        assert profile.recommendation_embedding_input
        assert profile.recommendation_embedding_json
        assert profile.extraction_version == "conversation_priority_v2"
        assert profile.extracted_at is not None

        turns = db.scalars(
            select(TeamfitExplorerTurn).order_by(TeamfitExplorerTurn.sequence_no.asc())
        ).all()
        assert len(turns) == 3
        assert [turn.sequence_no for turn in turns] == [1, 2, 3]
        assert all(turn.phase == "initial" for turn in turns)


def test_teamfit_save_validates_step1_and_step2_rules(client, signup_user, login_user):
    signup_user(email="teamfit-validation@example.com")
    login_user("teamfit-validation@example.com")

    too_long_problem_response = client.put(
        "/team-fit/me",
        json=build_payload(problem_statement="가" * 81),
    )
    too_few_sdgs_response = client.put(
        "/team-fit/me",
        json=build_payload(
            sdg_tags=["quality_education", "reduced_inequalities", "climate_action"]
        ),
    )
    too_long_narrative_response = client.put(
        "/team-fit/me",
        json=build_payload(narrative_markdown="a" * 801),
    )

    assert too_long_problem_response.status_code == 422
    assert any(
        "problem_statement" in str(part)
        for error in too_long_problem_response.json()["detail"]
        for part in error.get("loc", [])
    )
    assert too_few_sdgs_response.status_code == 400
    assert "4개" in too_few_sdgs_response.json()["detail"]
    assert too_long_narrative_response.status_code == 422


def test_teamfit_me_returns_saved_profile_and_active_count(
    client, signup_user, login_user
):
    seed_saved_profile(client, signup_user, login_user)

    response = client.get("/team-fit/me")

    assert response.status_code == 200
    body = response.json()
    assert body["active_profile_count"] == 1
    assert body["profile"]["problem_statement"] == build_payload()["problem_statement"]
    assert len(body["profile"]["history"]) == 3


def test_teamfit_followup_question_and_answer_append_history(
    client, signup_user, login_user, monkeypatch
):
    seed_saved_profile(client, signup_user, login_user)
    with SessionLocal() as db:
        before_profile = db.scalar(select(TeamfitExplorerProfile))
        assert before_profile is not None
        before_extracted_at = before_profile.extracted_at

    monkeypatch.setattr(
        "app.features.teamfit.service._generate_teamfit_question",
        lambda **_: "이 문제를 같이 풀 사람에게 꼭 기대하는 태도는 무엇인가요?",
    )

    question_response = client.post("/team-fit/interview/follow-up")
    assert question_response.status_code == 200
    assert question_response.json() == {
        "phase": "followup",
        "sequence_no": 4,
        "question": "이 문제를 같이 풀 사람에게 꼭 기대하는 태도는 무엇인가요?",
    }

    answer_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={
            "question": question_response.json()["question"],
            "answer": "문제를 정의하고 실행 우선순위를 분명하게 맞출 수 있으면 좋겠습니다.",
        },
    )

    assert answer_response.status_code == 200
    body = answer_response.json()
    assert len(body["history"]) == 4
    assert body["history"][-1]["phase"] == "followup"
    assert body["history"][-1]["sequence_no"] == 4

    with SessionLocal() as db:
        profile = db.scalar(select(TeamfitExplorerProfile))
        assert profile is not None
        assert profile.extracted_signals_json is not None
        assert profile.recommendation_embedding_input
        assert profile.recommendation_embedding_json
        assert profile.extracted_at is not None
        assert before_extracted_at is not None
        assert profile.extracted_at >= before_extracted_at

        turns = db.scalars(
            select(TeamfitExplorerTurn).order_by(TeamfitExplorerTurn.sequence_no.asc())
        ).all()
        assert len(turns) == 4
        assert turns[-1].phase == "followup"


def test_teamfit_saved_profile_can_be_edited_with_existing_history(
    client, signup_user, login_user
):
    save_response = seed_saved_profile(client, signup_user, login_user)
    profile = save_response.json()

    followup_response = client.post(
        "/team-fit/interview/follow-up-answer",
        json={
            "question": "같이 일할 때 꼭 확인하고 싶은 기준은 무엇인가요?",
            "answer": "문서를 빠르게 정리하고 실행으로 연결하는지 보고 싶습니다.",
        },
    )
    assert followup_response.status_code == 200
    followup_profile = followup_response.json()

    edited_history = [
        {
            "question": turn["question"],
            "answer": (
                "문서를 빠르게 정리하고 실행으로 연결하는지, 그리고 피드백을 열어두는지 보고 싶습니다."
                if turn["phase"] == "followup"
                else turn["answer"]
            ),
            "phase": turn["phase"],
        }
        for turn in followup_profile["history"]
    ]

    response = client.put(
        "/team-fit/me",
        json={
            "problem_statement": profile["problem_statement"],
            "mbti": profile["mbti"],
            "mbti_axis_values": profile["mbti_axis_values"],
            "sdg_tags": profile["sdg_tags"],
            "narrative_markdown": f"{profile['narrative_markdown']}\n\n추가 메모: 실제 대화 전환율도 보고 싶습니다.",
            "history": edited_history,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["history"]) == 4
    assert body["history"][-1]["phase"] == "followup"
    assert "피드백을 열어두는지" in body["history"][-1]["answer"]
    assert "추가 메모" in body["narrative_markdown"]


def test_teamfit_recommendations_require_approved_viewer(
    client, signup_user, login_user
):
    signup_user(email="recommendation-viewer@example.com")
    login_user("recommendation-viewer@example.com")
    save_response = client.put("/team-fit/me", json=build_payload())
    assert save_response.status_code == 200

    response = client.get("/team-fit/recommendations")

    assert response.status_code == 200
    body = response.json()
    assert body["requires_profile"] is False
    assert body["requires_approval"] is True
    assert body["recommended_people"] == []


def test_teamfit_candidate_directory_requires_approved_viewer(
    client, signup_user, login_user
):
    signup_user(email="directory-unapproved@example.com")
    login_user("directory-unapproved@example.com")
    save_response = client.put("/team-fit/me", json=build_payload())
    assert save_response.status_code == 200

    response = client.get("/team-fit/candidates")

    assert response.status_code == 200
    body = response.json()
    assert body["requires_approval"] is True
    assert body["candidates"] == []
    assert body["total_count"] == 0


def test_teamfit_recommendations_return_conversation_priority_cards_and_skip_unapproved_candidates(
    client, signup_user, login_user
):
    viewer_payload = build_structured_payload(
        problem_statement="사람들이 자신의 삶과 성장을 설계할 수 있는 구조 만들기",
        role="PM, 기획, 운영",
        strengths="문제 정의, 인터뷰 설계, 빠른 실험 운영, 문서화",
        wanted_people="백엔드나 AI 역할이 강하고 문제를 구조로 풀고 싶은 사람",
        collaboration="문서로 먼저 정리하고 빠르게 실험하는 협업이 잘 맞습니다. 피하고 싶은 협업은 말만 많고 실행이 느린 방식입니다.",
        why_now="팀빌딩을 촉이 아니라 더 나은 대화 시작 구조로 풀고 싶습니다.",
    )
    signup_user(email="viewer@example.com")
    viewer_id = update_user(
        "viewer@example.com", applicant_status="approved", name="Viewer"
    )
    login_user("viewer@example.com")
    viewer_save = client.put("/team-fit/me", json=viewer_payload)
    assert viewer_save.status_code == 200
    client.post("/auth/logout")

    safe_candidate_id = seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="safe@example.com",
        name="Backend Kim",
        payload=build_structured_payload(
            problem_statement="사람들이 자신의 삶과 성장을 설계하도록 돕는 팀빌딩 구조 만들기",
            role="백엔드, 풀스택",
            strengths="API 설계, 데이터 모델링, 빠른 프로토타이핑, 배포",
            wanted_people="PM이나 기획 역할과 함께 작은 실험을 바로 굴리고 싶은 사람",
            collaboration="문서화를 먼저 하고 빠르게 작게 배포하는 협업이 잘 맞습니다.",
            why_now="삶과 성장 문제를 실행 가능한 제품 구조로 만들고 싶습니다.",
        ),
    )
    complementary_candidate_id = seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="complementary@example.com",
        name="AI Lee",
        payload=build_structured_payload(
            problem_statement="사람의 성장 경로를 더 잘 탐색하게 돕는 AI 인터뷰 도구 만들기",
            role="AI, 백엔드",
            strengths="LLM 프로토타이핑, 데이터 파이프라인, 빠른 실험 반복",
            wanted_people="문제를 선명하게 정의하고 사용자 맥락을 깊게 보는 PM",
            collaboration="실험 근거를 보고 빠르게 방향을 바꾸는 협업이 잘 맞습니다.",
            why_now="지금은 추천보다 대화 품질을 높이는 AI 구조가 필요하다고 느낍니다.",
        ),
    )
    seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="wildcard@example.com",
        name="Design Choi",
        payload=build_structured_payload(
            problem_statement="사람이 자신의 변화 과정을 시각적으로 이해하게 돕는 성장 기록 경험 만들기",
            role="디자인, 프론트",
            strengths="정보 구조화, 인터랙션 설계, 사용자 흐름 시각화",
            wanted_people="PM이나 백엔드와 함께 복잡한 흐름을 실제 제품으로 증명해보고 싶은 사람",
            collaboration="차분하게 맥락을 정리한 뒤 빠르게 시안을 돌려보는 협업이 잘 맞습니다.",
            why_now="같은 문제라도 다른 표현 방식이 있으면 더 넓은 시야를 얻을 수 있다고 느낍니다.",
            sdg_tags=[
                "quality_education",
                "good_health_well_being",
                "sustainable_cities_communities",
                "partnerships_for_the_goals",
            ],
        ),
    )
    seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="lowsignal@example.com",
        name="Low Signal Park",
        payload=build_structured_payload(
            problem_statement="성장 문제를 풀고 싶습니다",
            role="운영",
            strengths="성실합니다",
            wanted_people="좋은 사람",
            collaboration="열심히 하겠습니다.",
            why_now="그냥 중요하다고 느낍니다.",
            sdg_tags=[
                "quality_education",
                "climate_action",
                "life_below_water",
                "life_on_land",
            ],
        ),
    )
    hidden_candidate_id = seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="hidden@example.com",
        name="Hidden Candidate",
        applicant_status="none",
        payload=build_structured_payload(
            problem_statement="사람들이 성장 경로를 설계하게 돕는 구조 만들기",
            role="백엔드",
            strengths="API 설계와 제품 구현",
            wanted_people="PM과 빠르게 실험할 사람",
            collaboration="문서화와 빠른 실행이 좋습니다.",
            why_now="지금 팀빌딩 문제에 직접 부딪히고 있기 때문입니다.",
        ),
    )

    login_user("viewer@example.com")
    response = client.get("/team-fit/recommendations")

    assert response.status_code == 200
    body = response.json()
    assert body["requires_profile"] is False
    assert body["requires_approval"] is False
    assert body["active_profile_count"] == 6

    recommended_ids = {item["candidate_id"] for item in body["recommended_people"]}
    recommended_types = [item["type"] for item in body["recommended_people"]]
    rejected_ids = {
        item["candidate_id"] for item in body["rejected_or_low_signal_candidates"]
    }
    rejected_map = {
        item["candidate_id"]: item for item in body["rejected_or_low_signal_candidates"]
    }

    assert "safe_fit" in recommended_types
    assert "complementary_fit" in recommended_types
    assert "wildcard_fit" in recommended_types
    assert len(recommended_types) == len(set(recommended_types))
    assert f"u_{viewer_id}" not in recommended_ids
    assert f"u_{safe_candidate_id}" in recommended_ids
    assert f"u_{complementary_candidate_id}" in recommended_ids
    assert f"u_{hidden_candidate_id}" not in recommended_ids
    assert f"u_{hidden_candidate_id}" not in rejected_ids
    assert rejected_ids
    first_rejected = next(iter(rejected_map.values()))
    assert first_rejected["problem_statement"]
    assert first_rejected["is_verified"] is True
    assert first_rejected["mbti"] == "ISFP-T"
    assert body["system_notes"]["scoring_explanation"]
    assert len(body["recommended_people"]) == 3
    assert all(item["history"] for item in body["recommended_people"])
    assert body["recommended_people"][0]["history"][0]["phase"] == "initial"


def test_teamfit_fit_check_excludes_scored_candidate_from_future_recommendations(
    client, signup_user, login_user
):
    viewer_payload = build_structured_payload(
        problem_statement="사람들이 자신의 삶과 성장을 설계할 수 있는 구조 만들기",
        role="PM, 기획, 운영",
        strengths="문제 정의, 인터뷰 설계, 빠른 실험 운영, 문서화",
        wanted_people="백엔드나 AI 역할이 강하고 문제를 구조로 풀고 싶은 사람",
        collaboration="문서로 먼저 정리하고 빠르게 실험하는 협업이 잘 맞습니다.",
        why_now="팀빌딩을 촉이 아니라 더 나은 대화 시작 구조로 풀고 싶습니다.",
    )
    signup_user(email="fit-viewer@example.com")
    viewer_id = update_user(
        "fit-viewer@example.com", applicant_status="approved", name="Fit Viewer"
    )
    login_user("fit-viewer@example.com")
    viewer_save = client.put("/team-fit/me", json=viewer_payload)
    assert viewer_save.status_code == 200
    client.post("/auth/logout")

    safe_candidate_id = seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="fit-safe@example.com",
        name="Fit Safe",
        payload=build_structured_payload(
            problem_statement="사람들이 자신의 삶과 성장을 설계하도록 돕는 팀빌딩 구조 만들기",
            role="백엔드, 풀스택",
            strengths="API 설계, 데이터 모델링, 빠른 프로토타이핑, 배포",
            wanted_people="PM이나 기획 역할과 함께 작은 실험을 바로 굴리고 싶은 사람",
            collaboration="문서화를 먼저 하고 빠르게 작게 배포하는 협업이 잘 맞습니다.",
            why_now="삶과 성장 문제를 실행 가능한 제품 구조로 만들고 싶습니다.",
        ),
    )
    seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="fit-complementary@example.com",
        name="Fit Complementary",
        payload=build_structured_payload(
            problem_statement="사람의 성장 경로를 더 잘 탐색하게 돕는 AI 인터뷰 도구 만들기",
            role="AI, 백엔드",
            strengths="LLM 프로토타이핑, 데이터 파이프라인, 빠른 실험 반복",
            wanted_people="문제를 선명하게 정의하고 사용자 맥락을 깊게 보는 PM",
            collaboration="실험 근거를 보고 빠르게 방향을 바꾸는 협업이 잘 맞습니다.",
            why_now="지금은 추천보다 대화 품질을 높이는 AI 구조가 필요하다고 느낍니다.",
        ),
    )
    seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="fit-wildcard@example.com",
        name="Fit Wildcard",
        payload=build_structured_payload(
            problem_statement="사람이 자신의 변화 과정을 시각적으로 이해하게 돕는 성장 기록 경험 만들기",
            role="디자인, 프론트",
            strengths="정보 구조화, 인터랙션 설계, 사용자 흐름 시각화",
            wanted_people="PM이나 백엔드와 함께 복잡한 흐름을 실제 제품으로 증명해보고 싶은 사람",
            collaboration="차분하게 맥락을 정리한 뒤 빠르게 시안을 돌려보는 협업이 잘 맞습니다.",
            why_now="같은 문제라도 다른 표현 방식이 있으면 더 넓은 시야를 얻을 수 있다고 느낍니다.",
        ),
    )
    seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="fit-extra@example.com",
        name="Fit Extra",
        payload=build_structured_payload(
            problem_statement="커뮤니티 안에서 대화 전환율을 높이는 운영 구조 만들기",
            role="운영, PM",
            strengths="후보 관리, 커뮤니케이션 운영, 실험 회고",
            wanted_people="제품과 데이터를 같이 보면서 흐름을 설계할 사람",
            collaboration="기록과 실행을 같이 챙기는 협업이 잘 맞습니다.",
            why_now="실제 대화 전환을 계속 설계해야 한다고 느낍니다.",
        ),
    )

    login_user("fit-viewer@example.com")

    save_check_response = client.put(
        f"/team-fit/fit-checks/{safe_candidate_id}",
        json={
            "fit_score": 82,
            "fit_note": "문제 공감대는 높았고, 역할 분담도 현실적으로 맞춰볼 수 있었습니다.",
        },
    )

    assert save_check_response.status_code == 200
    assert save_check_response.json()["fit_score"] == 82

    response = client.get("/team-fit/recommendations")

    assert response.status_code == 200
    body = response.json()
    recommended_ids = {item["candidate_id"] for item in body["recommended_people"]}
    assert f"u_{safe_candidate_id}" not in recommended_ids

    with SessionLocal() as db:
        fit_check = db.scalar(
            select(TeamfitFitCheck).where(
                TeamfitFitCheck.viewer_user_id == viewer_id,
                TeamfitFitCheck.target_user_id == safe_candidate_id,
            )
        )
        assert fit_check is not None
        assert fit_check.fit_score == 82


def test_teamfit_candidate_directory_returns_all_signed_up_users_with_teamfit_metadata(
    client, signup_user, login_user
):
    viewer_payload = build_structured_payload(
        problem_statement="사람들이 자신의 삶과 성장을 설계할 수 있는 구조 만들기",
        role="PM, 기획, 운영",
        strengths="문제 정의, 인터뷰 설계, 빠른 실험 운영, 문서화",
        wanted_people="백엔드나 AI 역할이 강하고 문제를 구조로 풀고 싶은 사람",
        collaboration="문서로 먼저 정리하고 빠르게 실험하는 협업이 잘 맞습니다.",
        why_now="팀빌딩을 촉이 아니라 더 나은 대화 시작 구조로 풀고 싶습니다.",
    )
    signup_user(email="directory-viewer@example.com")
    update_user(
        "directory-viewer@example.com",
        applicant_status="approved",
        name="Directory Viewer",
    )
    login_user("directory-viewer@example.com")
    viewer_save = client.put("/team-fit/me", json=viewer_payload)
    assert viewer_save.status_code == 200
    client.post("/auth/logout")

    profiled_user_id = seed_recommendation_profile(
        client,
        signup_user,
        login_user,
        email="directory-profiled@example.com",
        name="Directory Profiled",
        payload=build_structured_payload(
            problem_statement="사람들이 자신의 변화 경로를 더 잘 이해하게 돕는 구조 만들기",
            role="백엔드, AI",
            strengths="API 설계, 검색, 프로토타이핑",
            wanted_people="문제를 구조화하고 빠르게 실험할 PM",
            collaboration="문서화와 빠른 작은 배포가 잘 맞습니다.",
            why_now="실제 대화 전환을 돕는 제품을 만들고 싶습니다.",
        ),
    )

    login_user("directory-viewer@example.com")
    fit_check_response = client.put(
        f"/team-fit/fit-checks/{profiled_user_id}",
        json={"fit_score": 78, "fit_note": "실제 대화 후 역할 분담 감이 괜찮았습니다."},
    )
    assert fit_check_response.status_code == 200
    client.post("/auth/logout")

    signup_user(email="directory-empty@example.com")
    empty_user_id = update_user(
        "directory-empty@example.com",
        applicant_status="approved",
        name="Directory Empty",
        github_address="https://github.com/directory-empty",
        notion_url="https://www.notion.so/directory-empty",
    )

    login_user("directory-viewer@example.com")
    response = client.get("/team-fit/candidates")

    assert response.status_code == 200
    body = response.json()
    assert body["total_count"] == len(body["candidates"])
    assert body["total_count"] >= 2

    candidate_map = {item["user_id"]: item for item in body["candidates"]}
    assert viewer_save.json()["user_id"] not in candidate_map

    profiled_item = candidate_map[profiled_user_id]
    assert profiled_item["has_teamfit_profile"] is True
    assert profiled_item["fit_score"] == 78
    assert profiled_item["problem_statement"]
    assert profiled_item["reason_detail"]["problem_resonance"]
    assert profiled_item["history"]
    assert profiled_item["teamfit_rank"] is not None
    assert profiled_item["teamfit_score"] is not None

    empty_item = candidate_map[empty_user_id]
    assert empty_item["has_teamfit_profile"] is False
    assert empty_item["fit_score"] is None
    assert empty_item["problem_statement"] == ""
    assert empty_item["reason_detail"] is None
    assert empty_item["history"] == []
    assert empty_item["teamfit_rank"] is None


def test_teamfit_delete_interview_turn_removes_turn_and_resequences_history(
    client, signup_user, login_user
):
    _, followup_response = seed_saved_profile_with_followup_turns(
        client, signup_user, login_user
    )

    followup_turn_id = followup_response.json()["history"][-1]["id"]

    response = client.delete(f"/team-fit/me/interview-turns/{followup_turn_id}")

    assert response.status_code == 200
    body = response.json()
    assert len(body["history"]) == 3
    assert [turn["sequence_no"] for turn in body["history"]] == [1, 2, 3]
    assert all(turn["phase"] == "initial" for turn in body["history"])

    with SessionLocal() as db:
        turns = db.scalars(
            select(TeamfitExplorerTurn)
            .where(TeamfitExplorerTurn.user_id == body["user_id"])
            .order_by(
                TeamfitExplorerTurn.sequence_no.asc(), TeamfitExplorerTurn.id.asc()
            )
        ).all()
        assert len(turns) == 3
        assert [turn.sequence_no for turn in turns] == [1, 2, 3]


def test_teamfit_delete_interview_turn_rejects_when_only_initial_three_exist(
    client, signup_user, login_user
):
    response = seed_saved_profile(client, signup_user, login_user)
    turn_id = response.json()["history"][0]["id"]

    delete_response = client.delete(f"/team-fit/me/interview-turns/{turn_id}")

    assert delete_response.status_code == 400
    assert "최소 3개" in delete_response.json()["detail"]


def test_teamfit_generated_question_is_normalized_to_end_with_question_mark():
    result = _finalize_generated_teamfit_question(
        "같이 일할 때 가장 먼저 확인하고 싶은 기준은 무엇인가요",
        fallback_question="fallback question?",
    )

    assert result == "같이 일할 때 가장 먼저 확인하고 싶은 기준은 무엇인가요?"


def test_teamfit_generated_question_falls_back_when_output_looks_truncated():
    result = _finalize_generated_teamfit_question(
        "그분들의 답변이 당신의 문제 프레이밍과 얼마나 빠르게 맞",
        fallback_question="이 문제를 함께 풀 사람과 실제로 대화해보면 가장 먼저 확인하고 싶은 기준은 무엇인가요?",
    )

    assert (
        result
        == "이 문제를 함께 풀 사람과 실제로 대화해보면 가장 먼저 확인하고 싶은 기준은 무엇인가요?"
    )
