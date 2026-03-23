import { redirect } from "react-router-dom";

import type { AdminUser } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function adminUsersLoader(): Promise<AdminUser[] | Response> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    credentials: "include"
  });

  if (response.status === 401) {
    return redirect("/auth/login");
  }
  if (response.status === 403) {
    throw new Error("Admin only");
  }
  if (!response.ok) {
    throw new Error(`Failed to load users (${response.status})`);
  }

  return (await response.json()) as AdminUser[];
}

export async function fetchPendingVerifications(): Promise<AdminUser[]> {
  const response = await fetch(`${API_BASE_URL}/admin/verifications`, {
    credentials: "include"
  });
  if (!response.ok) throw new Error("인증 목록을 불러오지 못했습니다.");
  return (await response.json()) as AdminUser[];
}

export async function approveVerification(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/verifications/${userId}/approve`, {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) throw new Error("승인에 실패했습니다.");
}

export async function rejectVerification(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/verifications/${userId}/reject`, {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) throw new Error("거부에 실패했습니다.");
}

export async function revokeVerification(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/verifications/${userId}/revoke`, {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) throw new Error("인증 취소에 실패했습니다.");
}
