import { useState } from "react";
import { useLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import { LogoutButton } from "@/features/auth";

import { revokeVerification } from "../api";
import type { AdminUser } from "../types";

const STATUS_META: Record<string, { label: string; tone: "default" | "success" | "warn" }> = {
  none: { label: "미인증", tone: "default" },
  pending: { label: "대기 중", tone: "warn" },
  approved: { label: "인증 완료", tone: "success" },
  rejected: { label: "거부됨", tone: "default" }
};

function formatStatus(status: string | undefined) {
  return STATUS_META[status ?? "none"] ?? { label: status ?? "알 수 없음", tone: "default" };
}

export function AdminUsersPage() {
  const loadedUsers = useLoaderData() as AdminUser[];
  const [users, setUsers] = useState(loadedUsers);
  const [processing, setProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(userId: number) {
    setProcessing(userId);
    setError(null);
    try {
      await revokeVerification(userId);
      setUsers((prev) =>
        prev.map((user) =>
          user.user_id === userId
            ? {
                ...user,
                applicant_status: "none"
              }
            : user
        )
      );
    } catch {
      setError("인증 취소에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <ShellCard className="overflow-hidden bg-white/92 p-0">
      <div className="border-b border-border/80 bg-[linear-gradient(180deg,rgba(248,246,241,0.95),rgba(255,255,255,0.92))] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <StatusPill label="Admin only" />
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">전체 회원 관리</h2>
            <p className="text-sm text-muted-foreground">
              가입자와 현재 인증 상태를 확인하고, 필요하면 승인된 인증을 취소할 수 있습니다.
            </p>
          </div>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto px-6 py-4">
        {error && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left text-muted-foreground">
              <th className="py-3 font-medium">이름 / 이메일</th>
              <th className="py-3 font-medium">User ID</th>
              <th className="py-3 font-medium">Role</th>
              <th className="py-3 font-medium">인증 상태</th>
              <th className="py-3 font-medium">Created At</th>
              <th className="py-3 font-medium text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const status = formatStatus(user.applicant_status);

              return (
                <tr className="border-b border-border/60 last:border-b-0" key={user.user_id}>
                  <td className="py-4">
                    <div className="font-medium text-foreground">{user.name ?? "이름 없음"}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="py-4 font-medium text-foreground">{user.user_id}</td>
                  <td className="py-4">
                    <StatusPill
                      label={user.is_admin ? "admin" : "member"}
                      tone={user.is_admin ? "success" : "default"}
                    />
                  </td>
                  <td className="py-4">
                    <StatusPill label={status.label} tone={status.tone} />
                  </td>
                  <td className="py-4 text-muted-foreground">
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                  <td className="py-4 text-right">
                    {!user.is_admin && user.applicant_status === "approved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-stone-200 bg-white/90 text-stone-700 hover:bg-stone-50"
                        disabled={processing === user.user_id}
                        onClick={() => handleRevoke(user.user_id)}
                      >
                        인증 취소
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ShellCard>
  );
}
