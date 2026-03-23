import type { DashboardGrid, MemberCard } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchDashboard(): Promise<DashboardGrid> {
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    credentials: "include"
  });
  if (!response.ok) throw new Error("대시보드 데이터를 불러오지 못했습니다.");
  return (await response.json()) as DashboardGrid;
}

export async function fetchSlotMembers(
  interviewDate: string,
  timeSlot: number,
  room: number
): Promise<{ data?: MemberCard[]; error?: string }> {
  const params = new URLSearchParams({
    interview_date: interviewDate,
    time_slot: String(timeSlot),
    room: String(room)
  });
  const response = await fetch(`${API_BASE_URL}/dashboard/slot?${params}`, {
    credentials: "include"
  });
  if (response.ok) {
    return { data: (await response.json()) as MemberCard[] };
  }
  if (response.status === 403) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    return {
      error: body?.detail ?? "관리자 또는 17기 합격자 인증을 완료한 회원만 조회할 수 있습니다."
    };
  }
  return { error: "슬롯 정보를 불러오지 못했습니다." };
}
