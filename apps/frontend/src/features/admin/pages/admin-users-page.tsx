import { useLoaderData } from "react-router-dom";

import { ShellCard, StatusPill } from "@/common/components";
import { LogoutButton } from "@/features/auth";

import type { AdminUser } from "../types";

export function AdminUsersPage() {
  const users = useLoaderData() as AdminUser[];

  return (
    <ShellCard className="overflow-hidden bg-white/92 p-0">
      <div className="border-b border-border/80 bg-[linear-gradient(180deg,rgba(248,246,241,0.95),rgba(255,255,255,0.92))] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <StatusPill label="Admin only" />
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">All members</h2>
            <p className="text-sm text-muted-foreground">
              Lightweight operator view for checking who can access the current starter environment.
            </p>
          </div>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/80 text-left text-muted-foreground">
              <th className="py-3 font-medium">User ID</th>
              <th className="py-3 font-medium">Role</th>
              <th className="py-3 font-medium">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-b border-border/60 last:border-b-0" key={user.user_id}>
                <td className="py-4 font-medium text-foreground">{user.user_id}</td>
                <td className="py-4">
                  <StatusPill label={user.is_admin ? "admin" : "member"} tone={user.is_admin ? "success" : "default"} />
                </td>
                <td className="py-4 text-muted-foreground">{new Date(user.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ShellCard>
  );
}
