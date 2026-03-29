import type {
  VerificationApplyPayload,
  VerificationInviteCodeCheckResponse,
  VerificationStatusResponse
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function applyVerification(
  payload: VerificationApplyPayload
): Promise<{ data?: VerificationStatusResponse; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/verification/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  if (response.ok) {
    return { data: (await response.json()) as VerificationStatusResponse };
  }
  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "신청에 실패했습니다." };
}

export async function getMyVerificationStatus(): Promise<VerificationStatusResponse | null> {
  const response = await fetch(`${API_BASE_URL}/verification/me`, {
    credentials: "include"
  });
  if (!response.ok) return null;
  return (await response.json()) as VerificationStatusResponse;
}

export async function checkVerificationInviteCode(
  inviteCode: string
): Promise<{ data?: VerificationInviteCodeCheckResponse; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/verification/invite-code/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invite_code: inviteCode }),
    credentials: "include"
  });
  if (response.ok) {
    return { data: (await response.json()) as VerificationInviteCodeCheckResponse };
  }
  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "초대코드를 확인하지 못했습니다." };
}
