from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import OperationalError

import app.main as app_main
from app.common.db import SessionLocal
from app.common.security import hash_password, verify_password
from app.features.auth.models import User
from app.features.auth import service as auth_service
from app.features.auth.service import sync_admin_seed


def test_signup_login_me_and_logout_flow(client, signup_user, login_user):
    result = signup_user()
    user_id = result["user_id"]
    assert result["response"].json()["user_id"] == user_id
    assert result["response"].json()["is_admin"] is False

    login_response = login_user(result["email"])
    assert login_response.json() == {"user_id": user_id, "is_admin": False}
    assert "pm_access_token" in login_response.cookies

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user_id"] == user_id
    assert me_response.json()["is_admin"] is False

    logout_response = client.post("/auth/logout")
    assert logout_response.status_code == 204

    me_after_logout = client.get("/auth/me")
    assert me_after_logout.status_code == 401


def test_delete_me_removes_user_and_clears_session(client, signup_user, login_user):
    result = signup_user(email="delete-me@example.com")
    login_user(result["email"])

    delete_response = client.request(
        "DELETE",
        "/auth/me",
        json={"email": "DELETE-ME@example.com"},
    )
    assert delete_response.status_code == 204

    me_after_delete = client.get("/auth/me")
    assert me_after_delete.status_code == 401

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "delete-me@example.com"))
        assert user is None


def test_delete_me_rejects_mismatched_email(client, signup_user, login_user):
    result = signup_user(email="keep-me@example.com")
    login_user(result["email"])

    delete_response = client.request(
        "DELETE",
        "/auth/me",
        json={"email": "someone-else@example.com"},
    )
    assert delete_response.status_code == 400
    assert delete_response.json()["detail"] == "현재 로그인한 이메일을 입력해야 회원 탈퇴할 수 있습니다."

    me_response = client.get("/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "keep-me@example.com"

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "keep-me@example.com"))
        assert user is not None


def test_signup_assigns_non_null_gender(client):
    signup_response = client.post("/auth/signup", json={"email": "gendered@example.com", "password": "123456"})
    assert signup_response.status_code == 201
    assert signup_response.json()["gender"] in {"M", "F"}

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "gendered@example.com"))
        assert user is not None
        assert user.gender in {"M", "F"}


def test_postgres_user_gender_constraints_fail_soft_on_lock_timeout(monkeypatch):
    class FakeConnection:
        def __init__(self):
            self.dialect = type("FakeDialect", (), {"name": "postgresql"})()
            self.rollback_called = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, statement):
            sql = str(statement)
            if "ALTER TABLE users ALTER COLUMN gender SET DEFAULT" in sql:
                raise OperationalError("ALTER TABLE", {}, Exception("lock timeout"))
            return None

        def commit(self):
            raise AssertionError("commit should not be reached after a lock timeout")

        def rollback(self):
            self.rollback_called = True

    class FakeEngine:
        def __init__(self, connection):
            self.connection = connection

        def connect(self):
            return self.connection

    fake_connection = FakeConnection()
    monkeypatch.setattr(app_main, "engine", FakeEngine(fake_connection))

    app_main.ensure_postgres_user_gender_constraints()

    assert fake_connection.rollback_called is True


def test_sync_admin_seed_keeps_existing_admin_pin():
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == auth_service.ADMIN_SEED_EMAIL))
        assert admin is not None
        admin.password_hash = hash_password("9876")
        db.commit()

        sync_admin_seed(db)

        db.refresh(admin)
        assert verify_password("9876", admin.password_hash)
        assert not verify_password("123456", admin.password_hash)


def test_signup_resend_reissues_a_fresh_verification_code(client, monkeypatch):
    issued_codes = iter(("111111", "222222"))

    def fake_generate_otp():
        return next(issued_codes), datetime.now(timezone.utc) + timedelta(minutes=10)

    monkeypatch.setattr(auth_service, "_generate_otp", fake_generate_otp)

    signup_response = client.post("/auth/signup", json={"email": "retry@example.com", "password": "123456"})
    assert signup_response.status_code == 201

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "retry@example.com"))
        assert user is not None
        assert user.otp_code == "111111"

    resend_response = client.post("/auth/verify/resend", json={"email": "retry@example.com"})
    assert resend_response.status_code == 204

    expired_code_response = client.post("/auth/verify", json={"email": "retry@example.com", "otp": "111111"})
    assert expired_code_response.status_code == 400

    fresh_code_response = client.post("/auth/verify", json={"email": "retry@example.com", "otp": "222222"})
    assert fresh_code_response.status_code == 204


def test_signup_again_for_unverified_email_reissues_code_and_updates_pin(client, monkeypatch):
    issued_codes = iter(("333333", "444444"))

    def fake_generate_otp():
        return next(issued_codes), datetime.now(timezone.utc) + timedelta(minutes=10)

    monkeypatch.setattr(auth_service, "_generate_otp", fake_generate_otp)

    first_signup = client.post("/auth/signup", json={"email": "pending@example.com", "password": "123456"})
    assert first_signup.status_code == 201

    second_signup = client.post("/auth/signup", json={"email": "pending@example.com", "password": "567890"})
    assert second_signup.status_code == 201

    old_code_response = client.post("/auth/verify", json={"email": "pending@example.com", "otp": "333333"})
    assert old_code_response.status_code == 400

    verify_response = client.post("/auth/verify", json={"email": "pending@example.com", "otp": "444444"})
    assert verify_response.status_code == 204

    login_response = client.post("/auth/login", json={"email": "pending@example.com", "password": "567890"})
    assert login_response.status_code == 200
