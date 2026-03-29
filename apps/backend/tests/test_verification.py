from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.auth.models import User


def build_verification_payload(**overrides):
    payload = {
        "name": "홍길동",
        "gender": "M",
        "birth_date": "2000-01-01",
        "residence": "서울시 강남구",
        "invite_code": "",
        "github_address": "https://github.com/honggildong",
        "notion_url": "https://www.notion.so/honggildong",
        "interview_date": "2026-03-19",
        "interview_start_time": "09:00",
        "interview_room": 1,
    }
    payload.update(overrides)
    return payload


def test_verification_apply_auto_approves_with_matching_invite_code(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="verified-invite@example.com")
    login_user("verified-invite@example.com")
    monkeypatch.setenv(
        "VERIFICATION_AUTO_APPROVE_INVITE_CODES",
        "teamtalk-2026, asm17-fast-pass",
    )

    response = client.post(
        "/verification/apply",
        json=build_verification_payload(invite_code=" TEAMTALK-2026 "),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["applicant_status"] == "approved"

    with SessionLocal() as db:
        user = db.scalar(
            select(User).where(User.email == "verified-invite@example.com")
        )
        assert user is not None
        assert user.applicant_status == "approved"
        assert user.phone is None


def test_verification_invite_code_check_reports_match(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="check-match@example.com")
    login_user("check-match@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/invite-code/check",
        json={"invite_code": "TEAMTALK-2026"},
    )

    assert response.status_code == 200
    assert response.json() == {"matches_auto_approve_invite_code": True}


def test_verification_invite_code_check_reports_mismatch(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="check-mismatch@example.com")
    login_user("check-mismatch@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/invite-code/check",
        json={"invite_code": "wrong-code"},
    )

    assert response.status_code == 200
    assert response.json() == {"matches_auto_approve_invite_code": False}


def test_verification_invite_code_check_rejects_non_ascii_input_without_crashing(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="check-non-ascii@example.com")
    login_user("check-non-ascii@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/invite-code/check",
        json={"invite_code": "초대코드"},
    )

    assert response.status_code == 200
    assert response.json() == {"matches_auto_approve_invite_code": False}


def test_verification_apply_requires_invite_code_for_non_approved_user(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="pending-invite@example.com")
    login_user("pending-invite@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/apply",
        json=build_verification_payload(invite_code=""),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "합격자 초대코드는 필수 입력 항목입니다."


def test_verification_apply_rejects_invalid_invite_code_for_non_approved_user(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="invalid-invite@example.com")
    login_user("invalid-invite@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/apply",
        json=build_verification_payload(invite_code="wrong-code"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "합격자 초대코드가 일치하지 않습니다."


def test_verification_apply_rejects_non_ascii_invite_code_without_server_error(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="invalid-non-ascii@example.com")
    login_user("invalid-non-ascii@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    response = client.post(
        "/verification/apply",
        json=build_verification_payload(invite_code="초대코드"),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "합격자 초대코드가 일치하지 않습니다."


def test_verification_apply_allows_approved_user_to_edit_without_invite_code(
    client, signup_user, login_user, monkeypatch
):
    signup_user(email="approved-edit@example.com")
    login_user("approved-edit@example.com")
    monkeypatch.setenv("VERIFICATION_AUTO_APPROVE_INVITE_CODES", "teamtalk-2026")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "approved-edit@example.com"))
        assert user is not None
        user.applicant_status = "approved"
        db.commit()

    response = client.post(
        "/verification/apply",
        json=build_verification_payload(invite_code=""),
    )

    assert response.status_code == 200
    assert response.json()["applicant_status"] == "approved"
