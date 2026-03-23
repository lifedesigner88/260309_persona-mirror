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
  const password = String(formData.get("password") ?? "");
  const email = String(formData.get("email") ?? "").trim() || undefined;

  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, email }),
    credentials: "include",
  });

  if (response.ok) {
    return { signupEmail: email };
  }

  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Signup failed" };
}

export async function requestPinReset(email: string): Promise<{ error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-pin/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  if (response.ok) return {};
  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Request failed" };
}

export async function confirmPinReset(email: string, otp: string, new_pin: string): Promise<{ error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/reset-pin/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, new_pin }),
    credentials: "include",
  });
  if (response.ok) return {};
  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Reset failed" };
}

export async function verifyOtp(email: string, otp: string): Promise<{ error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
    credentials: "include",
  });

  if (response.ok) return {};

  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Verification failed" };
}

export async function loginAction({ request }: { request: Request }): Promise<AuthActionData | Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
