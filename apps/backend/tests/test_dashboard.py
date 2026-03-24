from datetime import date, time

from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.auth.models import User
from app.features.dashboard.models import MemberCheck


def approve_user(
    email: str,
    *,
    name: str,
    gender: str = "M",
    interview_date: date | None = None,
    interview_time_slot: int | None = None,
    interview_room: int | None = None,
) -> int:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        user.applicant_status = "approved"
        user.name = name
        user.gender = gender
        user.birth_date = date(1988, 1, 1)
        user.residence = "서울시 은평구"
        user.interview_date = interview_date
        user.interview_time_slot = interview_time_slot
        user.interview_room = interview_room
        user.interview_start_time = (
            time(9, 30) if interview_date and interview_time_slot and interview_room else None
        )
        db.commit()
        db.refresh(user)
        return user.user_id


def test_slot_members_include_checked_state_for_logged_in_viewer(client, signup_user, login_user):
    signup_user(user_id="VIEW1", email="viewer@example.com")
    signup_user(user_id="TAR01", email="alpha@example.com")
    signup_user(user_id="TAR02", email="beta@example.com")

    viewer_user_id = approve_user(email="viewer@example.com", name="뷰어")
    approve_user(
        email="alpha@example.com",
        name="알파",
        gender="M",
        interview_date=date(2026, 3, 20),
        interview_time_slot=1,
        interview_room=1,
    )
    beta_user_id = approve_user(
        email="beta@example.com",
        name="베타",
        gender="F",
        interview_date=date(2026, 3, 20),
        interview_time_slot=1,
        interview_room=1,
    )

    with SessionLocal() as db:
        db.add(
            MemberCheck(
                viewer_user_id=viewer_user_id,
                target_user_id=beta_user_id,
                is_checked=True,
            )
        )
        db.commit()

    login_user("viewer@example.com")

    response = client.get(
        "/dashboard/slot",
        params={"interview_date": "2026-03-20", "time_slot": 1, "room": 1},
    )

    assert response.status_code == 200
    cards = response.json()
    alpha_card = next(card for card in cards if card["email"] == "alpha@example.com")
    beta_card = next(card for card in cards if card["email"] == "beta@example.com")

    assert alpha_card["is_checked"] is False
    assert beta_card["is_checked"] is True


def test_member_check_can_be_saved_and_unchecked(client, signup_user, login_user):
    signup_user(user_id="VIEW2", email="viewer2@example.com")
    signup_user(user_id="TAR03", email="gamma@example.com")

    approve_user(email="viewer2@example.com", name="뷰어2")
    target_user_id = approve_user(email="gamma@example.com", name="감마")

    login_user("viewer2@example.com")

    save_response = client.put(
        f"/dashboard/member-checks/{target_user_id}",
        json={"is_checked": True},
    )

    assert save_response.status_code == 200
    assert save_response.json() == {"target_user_id": target_user_id, "is_checked": True}

    with SessionLocal() as db:
        saved = db.scalar(
            select(MemberCheck).where(
                MemberCheck.viewer_user_id == select(User.user_id)
                .where(User.email == "viewer2@example.com")
                .scalar_subquery(),
                MemberCheck.target_user_id == target_user_id,
            )
        )
        assert saved is not None
        assert saved.is_checked is True

    unsave_response = client.put(
        f"/dashboard/member-checks/{target_user_id}",
        json={"is_checked": False},
    )

    assert unsave_response.status_code == 200
    assert unsave_response.json() == {"target_user_id": target_user_id, "is_checked": False}

    with SessionLocal() as db:
        saved = db.scalar(
            select(MemberCheck).where(
                MemberCheck.viewer_user_id == select(User.user_id)
                .where(User.email == "viewer2@example.com")
                .scalar_subquery(),
                MemberCheck.target_user_id == target_user_id,
            )
        )
        assert saved is not None
        assert saved.is_checked is False


def test_member_check_requires_approved_or_admin(client, signup_user, login_user):
    signup_user(user_id="VIEW3", email="viewer3@example.com")
    login_user("viewer3@example.com")

    response = client.put("/dashboard/member-checks/999", json={"is_checked": True})

    assert response.status_code == 403
    assert response.json()["detail"] == "관리자 또는 17기 합격자 인증을 완료한 회원만 조회할 수 있습니다."
