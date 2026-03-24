from datetime import date

from pydantic import BaseModel


class SlotCell(BaseModel):
    """단일 면접 슬롯 셀 (날짜·타임·방·자리)"""
    date: date
    time_slot: int
    room: int
    seat: int  # 1-5
    color: str  # "gray" | "blue" | "pink"
    user_id: int | None = None


class DashboardGrid(BaseModel):
    """전체 대시보드 그리드"""
    cells: list[SlotCell]
    total_slots: int
    filled_slots: int
    approved_member_count: int


class MemberCard(BaseModel):
    """방 클릭 시 보이는 멤버 카드 (인증 완료자만 조회 가능)"""
    seat: int
    user_id: int | None
    name: str | None
    birth_year: int | None
    residence: str | None
    gender: str | None
    email: str | None
    github_address: str | None
    notion_url: str | None
    is_checked: bool = False


class MemberCheckUpdate(BaseModel):
    is_checked: bool


class MemberCheckState(BaseModel):
    target_user_id: int
    is_checked: bool
