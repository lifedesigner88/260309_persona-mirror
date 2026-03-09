import { redirect } from "react-router-dom";

import type { AuthActionData, RootLoaderData } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function rootLoader(): Promise<RootLoaderData> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return { sessionUser: null };
  }
  if (!response.ok) {
    throw new Error(`Failed to load session (${response.status})`);
  }

  return {
    sessionUser: (await response.json()) as RootLoaderData["sessionUser"],
  };
}

export async function signupAction({ request }: { request: Request }): Promise<AuthActionData | Response> {
  const formData = await request.formData();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, password }),
    credentials: "include",
  });

  if (response.ok) {
    return redirect("/auth/login");
  }

  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Signup failed" };
}

export async function loginAction({ request }: { request: Request }): Promise<AuthActionData | Response> {
  const formData = await request.formData();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, password }),
    credentials: "include",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail ?? "Login failed" };
  }

  return redirect("/");
}

export async function logoutRequest() {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
