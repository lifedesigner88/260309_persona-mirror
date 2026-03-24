import i18n from "@/lib/i18n";
import type { DashboardGrid, MemberCard, MemberCheckState } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function fetchDashboard(): Promise<DashboardGrid> {
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    credentials: "include"
  });
  if (!response.ok) throw new Error(i18n.t("dashboard.apiDashboardLoadFailed"));
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
  if (response.status === 401 || response.status === 403) {
    return { error: i18n.t("dashboard.accessNote") };
  }
  return { error: i18n.t("dashboard.apiSlotLoadFailed") };
}

export async function updateMemberCheck(
  targetUserId: number,
  isChecked: boolean
): Promise<{ data?: MemberCheckState; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/dashboard/member-checks/${targetUserId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ is_checked: isChecked })
  });

  if (response.ok) {
    return { data: (await response.json()) as MemberCheckState };
  }

  if (response.status === 401 || response.status === 403) {
    return { error: i18n.t("dashboard.accessNote") };
  }

  return { error: i18n.t("dashboard.apiMemberCheckFailed") };
}
