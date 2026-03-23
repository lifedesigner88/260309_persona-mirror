import { useEffect, useState } from "react";

import { Button, ShellCard, StatusPill } from "@/common/components";
import {
  formatInterviewRoom,
  formatInterviewStartTime,
  formatInterviewTimeSlot
} from "@/lib/interview";
import { approveVerification, fetchPendingVerifications, rejectVerification } from "../api";
import type { AdminUser } from "../types";

const DATE_LABEL: Record<string, string> = {
  "2026-03-19": "3/19",
  "2026-03-20": "3/20",
  "2026-03-21": "3/21",
  "2026-03-22": "3/22"
};

function formatSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatGender(value: string | null | undefined) {
  if (value === "M") {
    return "남";
  }
  if (value === "F") {
    return "여";
  }
  return "-";
}

function renderValue(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

type InfoFieldProps = {
  label: string;
  value: string | null | undefined;
  href?: string | null;
  mono?: boolean;
};

function InfoField({ label, value, href, mono = false }: InfoFieldProps) {
  const displayValue = renderValue(value);

  return (
    <div className="rounded-2xl border border-border/60 bg-[rgba(249,247,243,0.85)] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
        {label}
      </div>
      {href && displayValue !== "-" ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block break-all text-sm leading-5 text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-900"
        >
          {displayValue}
        </a>
      ) : (
        <div
          className={`mt-1 break-all text-sm leading-5 text-foreground/85 ${mono ? "font-mono text-[13px]" : ""}`}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}

export function AdminVerificationsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await fetchPendingVerifications());
    } catch {
      setError("인증 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleApprove(userId: number) {
    setProcessing(userId);
    try {
      await approveVerification(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch {
      setError("승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(userId: number) {
    setProcessing(userId);
    try {
      await rejectVerification(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch {
      setError("거부에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <ShellCard className="overflow-hidden bg-white/92 p-0">
      <div className="border-b border-border/80 bg-[linear-gradient(180deg,rgba(248,246,241,0.95),rgba(255,255,255,0.92))] px-6 py-5">
        <StatusPill label="Admin only" />
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">인증 신청 관리</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          대기 중인 합격자 인증 신청 목록입니다. 제출 정보 전체와 카카오톡 오픈채팅 확인 내용을 함께
          보고 승인하세요.
        </p>
      </div>

      <div className="px-6 py-4">
        {error && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">대기 중인 인증 신청이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.user_id}
                className="rounded-[28px] border border-border/60 bg-white/85 px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold tracking-[-0.02em]">
                        {user.name ?? "이름 없음"}
                      </span>
                      <span className="rounded-full border border-border/60 bg-[rgba(248,246,241,0.9)] px-2 py-0.5 text-[11px] font-medium text-foreground/60">
                        신청 #{user.user_id}
                      </span>
                      <span className="rounded-full border border-border/60 bg-[rgba(248,246,241,0.9)] px-2 py-0.5 text-[11px] font-medium text-foreground/60">
                        {formatSubmittedAt(user.created_at)} 신청
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoField label="성별" value={formatGender(user.gender)} />
                      <InfoField label="생년월일" value={user.birth_date} mono />
                      <InfoField label="거주지" value={user.residence} />
                      <InfoField label="휴대폰 번호" value={user.phone} mono />
                      <InfoField
                        label="면접 날짜"
                        value={
                          user.interview_date
                            ? (DATE_LABEL[user.interview_date] ?? user.interview_date)
                            : "-"
                        }
                      />
                      <InfoField
                        label="면접 시작시간"
                        value={formatInterviewStartTime(user.interview_start_time)}
                        mono
                      />
                      <InfoField
                        label="자동 분류 타임"
                        value={formatInterviewTimeSlot(user.interview_time_slot, false)}
                      />
                      <InfoField
                        label="면접 분과"
                        value={formatInterviewRoom(user.interview_room)}
                      />
                      <InfoField
                        label="GitHub"
                        value={user.github_address}
                        href={user.github_address}
                      />
                      <InfoField label="Notion" value={user.notion_url} href={user.notion_url} />
                    </div>
                  </div>
                  <div className="flex gap-2 self-start">
                    <Button
                      size="sm"
                      disabled={processing === user.user_id}
                      onClick={() => handleApprove(user.user_id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processing === user.user_id}
                      onClick={() => handleReject(user.user_id)}
                    >
                      거부
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ShellCard>
  );
}
