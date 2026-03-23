from sqlalchemy import select

from app.common.db import SessionLocal
from app.features.auth.models import User
from app.features.capture.models import CaptureJob


def build_capture_payload():
    return {
        "interview": {
            "selfSummary": "차분한 디지털 페르소나를 만들고 싶다.",
            "coreValues": "기록, 일관성, 몰입",
            "speakingStyle": "짧고 분명한 문장",
            "keywords": "mirror, archive, calm",
        },
        "voice": {
            "inputMode": "later",
            "sampleFileName": "",
            "toneNotes": "낮고 차분한 톤",
            "deliveryGoal": "또렷한 설명",
        },
        "image": {
            "inputMode": "later",
            "referenceFileName": "",
            "visualDirection": "editorial portrait",
            "framingNotes": "shoulder-up",
        },
        "updatedAt": "2026-03-10T10:00:00Z",
    }


def test_capture_job_create_list_and_get(user_session):
    client, user_id = user_session()

    create_response = client.post("/capture/jobs", json=build_capture_payload())
    assert create_response.status_code == 201

    created_job = create_response.json()
    assert created_job["owner_user_id"] == user_id
    assert created_job["status"] == "pending"

    list_response = client.get("/capture/jobs")
    assert list_response.status_code == 200
    jobs = list_response.json()
    assert len(jobs) == 1
    assert jobs[0]["id"] == created_job["id"]

    get_response = client.get(f"/capture/jobs/{created_job['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == created_job["id"]


def test_capture_job_is_linked_to_user_by_foreign_key(user_session):
    client, user_id = user_session()

    create_response = client.post("/capture/jobs", json=build_capture_payload())
    assert create_response.status_code == 201
    created_job = create_response.json()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.user_id == user_id))
        job = db.scalar(select(CaptureJob).where(CaptureJob.id == created_job["id"]))

        assert user is not None
        assert job is not None
        assert job.owner_id == user.id
        assert job.owner.user_id == user_id


def test_capture_job_requires_authentication(client):
    response = client.get("/capture/jobs")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


def test_admin_can_get_another_users_capture_job(user_session, login_user):
    client, user_id = user_session()

    create_response = client.post("/capture/jobs", json=build_capture_payload())
    assert create_response.status_code == 201
    created_job = create_response.json()

    login_user("parksejong88@gmail.com", "2026")
    admin_get_response = client.get(f"/capture/jobs/{created_job['id']}")

    assert admin_get_response.status_code == 200
    assert admin_get_response.json()["id"] == created_job["id"]
    assert admin_get_response.json()["owner_user_id"] == user_id


def test_owner_can_delete_capture_job(user_session):
    client, _ = user_session()

    create_response = client.post("/capture/jobs", json=build_capture_payload())
    assert create_response.status_code == 201
    created_job = create_response.json()

    delete_response = client.delete(f"/capture/jobs/{created_job['id']}")
    assert delete_response.status_code == 204

    list_response = client.get("/capture/jobs")
    assert list_response.status_code == 200
    assert list_response.json() == []
