import { redirect } from "react-router-dom";

import type { AdminUser } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function adminUsersLoader(): Promise<AdminUser[] | Response> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    credentials: "include",
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
