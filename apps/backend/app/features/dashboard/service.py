from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.auth.models import User

from .schemas import DashboardGrid, MemberCard, SlotCell

# 면접 날짜 4일
INTERVIEW_DATES = [
    date(2026, 3, 19),
    date(2026, 3, 20),
    date(2026, 3, 21),
    date(2026, 3, 22),
]
ROOMS = [1, 2, 3, 4, 5]
MAX_TIME_SLOTS = 5
OFFICIAL_SEATS_PER_ROOM = 5
DISPLAY_SEATS_PER_ROOM = 7


def _color(user: User | None) -> str:
    if user is None:
        return "gray"
    if user.gender == "M":
        return "blue"
    if user.gender == "F":
        return "pink"
    return "gray"


def get_dashboard(db: Session) -> DashboardGrid:
    # 승인된 유저만 색상 표시
    approved_users = db.scalars(
        select(User).where(User.applicant_status == "approved")
    ).all()

    # (date, time_slot, room) → list[User] 인덱스
    slot_map: dict[tuple[date, int, int], list[User]] = {}
    for user in approved_users:
        if user.interview_date and user.interview_time_slot and user.interview_room:
            key = (user.interview_date, user.interview_time_slot, user.interview_room)
            slot_map.setdefault(key, []).append(user)

    cells: list[SlotCell] = []
    for d in INTERVIEW_DATES:
        for t in range(1, MAX_TIME_SLOTS + 1):
            for r in ROOMS:
                key = (d, t, r)
                users_in_slot = slot_map.get(key, [])
                for seat in range(1, DISPLAY_SEATS_PER_ROOM + 1):
                    user = users_in_slot[seat - 1] if seat <= len(users_in_slot) else None
                    cells.append(
                        SlotCell(
                            date=d,
                            time_slot=t,
                            room=r,
                            seat=seat,
                            color=_color(user),
                            user_id=user.user_id if user else None,
                        )
                    )

    filled = sum(1 for c in cells if c.color != "gray")
    total_slots = len(INTERVIEW_DATES) * MAX_TIME_SLOTS * len(ROOMS) * OFFICIAL_SEATS_PER_ROOM
    return DashboardGrid(cells=cells, total_slots=total_slots, filled_slots=filled)


def get_slot_members(
    interview_date: date,
    time_slot: int,
    room: int,
    current_user: User,
    db: Session,
) -> list[MemberCard]:
    if not current_user.is_admin and current_user.applicant_status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 또는 17기 합격자 인증을 완료한 회원만 조회할 수 있습니다.",
        )

    users = db.scalars(
        select(User).where(
            User.applicant_status == "approved",
            User.interview_date == interview_date,
            User.interview_time_slot == time_slot,
            User.interview_room == room,
        )
    ).all()

    # 자리 번호 순으로 정렬 (등록 순서 기준 — user_id asc)
    users_sorted = sorted(users, key=lambda u: u.user_id)

    cards: list[MemberCard] = []
    for seat in range(1, DISPLAY_SEATS_PER_ROOM + 1):
        user = users_sorted[seat - 1] if seat <= len(users_sorted) else None
        cards.append(
            MemberCard(
                seat=seat,
                user_id=user.user_id if user else None,
                name=user.name if user else None,
                gender=user.gender if user else None,
                email=user.email if user else None,
                github_address=user.github_address if user else None,
                notion_url=user.notion_url if user else None,
            )
        )
    return cards
