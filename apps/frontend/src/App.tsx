import {
  Form,
  Link,
  Outlet,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError
} from "react-router-dom";

import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "pm_access_token";

type HealthLoaderData = { initialStatus: string };
type HealthActionData = { result: string };
type AuthActionData = { error?: string };
type AdminUser = { user_id: string; is_admin: boolean; created_at: string };

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function requestHealthStatus(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  const data = (await response.json()) as { status?: string };
  return data.status ?? "unknown";
}

export function App() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold tracking-tight">PersonaMirror</h1>
      <nav className="mb-4 mt-4 flex flex-wrap gap-3">
        <Link className="text-sm underline-offset-4 hover:underline" to="/">
          Home
        </Link>
        <Link className="text-sm underline-offset-4 hover:underline" to="/auth/signup">
          Sign up
        </Link>
        <Link className="text-sm underline-offset-4 hover:underline" to="/auth/login">
          Login
        </Link>
        <Link className="text-sm underline-offset-4 hover:underline" to="/admin/users">
          Admin Users
        </Link>
        <Link className="text-sm underline-offset-4 hover:underline" to="/capture">
          Capture
        </Link>
      </nav>
      <Outlet />
    </main>
  );
}

export function homeLoader(): HealthLoaderData {
  return { initialStatus: "not checked" };
}

export async function homeAction(): Promise<HealthActionData> {
  try {
    const result = await requestHealthStatus();
    return { result };
  } catch {
    return { result: "request failed" };
  }
}

export function HomePage() {
  const loaderData = useLoaderData() as HealthLoaderData;
  const actionData = useActionData() as HealthActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const result = actionData?.result ?? loaderData.initialStatus;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <p className="text-sm text-muted-foreground">Phase 1 auth foundation is in progress.</p>
      <Form method="post">
        <Button type="submit" disabled={loading}>
          {loading ? "Checking..." : "Check Backend Health"}
        </Button>
      </Form>
      <p className="text-sm">health: {result}</p>
    </section>
  );
}

export async function signupAction({ request }: { request: Request }): Promise<AuthActionData | Response> {
  const formData = await request.formData();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, password })
  });

  if (response.ok) {
    return redirect("/auth/login");
  }

  const data = (await response.json().catch(() => null)) as { detail?: string } | null;
  return { error: data?.detail ?? "Signup failed" };
}

export function SignupPage() {
  const actionData = useActionData() as AuthActionData | undefined;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">Sign up</h2>
      <Form className="space-y-3" method="post">
        <label className="block text-sm">
          User ID
          <input className="mt-1 w-full rounded-md border px-3 py-2" name="user_id" required />
        </label>
        <label className="block text-sm">
          Password
          <input className="mt-1 w-full rounded-md border px-3 py-2" name="password" required type="password" />
        </label>
        <Button type="submit">Create Account</Button>
      </Form>
      {actionData?.error ? <p className="text-sm text-red-600">{actionData.error}</p> : null}
    </section>
  );
}

export async function loginAction({ request }: { request: Request }): Promise<AuthActionData | Response> {
  const formData = await request.formData();
  const user_id = String(formData.get("user_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, password })
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { detail?: string } | null;
    return { error: data?.detail ?? "Login failed" };
  }

  const data = (await response.json()) as { access_token: string };
  setToken(data.access_token);
  return redirect("/");
}

export function LoginPage() {
  const actionData = useActionData() as AuthActionData | undefined;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-semibold">Login</h2>
      <Form className="space-y-3" method="post">
        <label className="block text-sm">
          User ID
          <input className="mt-1 w-full rounded-md border px-3 py-2" name="user_id" required />
        </label>
        <label className="block text-sm">
          Password
          <input className="mt-1 w-full rounded-md border px-3 py-2" name="password" required type="password" />
        </label>
        <Button type="submit">Login</Button>
      </Form>
      {actionData?.error ? <p className="text-sm text-red-600">{actionData.error}</p> : null}
    </section>
  );
}

export async function logoutAction(): Promise<Response> {
  clearToken();
  return redirect("/");
}

export async function adminUsersLoader(): Promise<AdminUser[] | Response> {
  const token = getToken();
  if (!token) {
    return redirect("/auth/login");
  }

  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.status === 401) {
    clearToken();
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

export function AdminUsersPage() {
  const users = useLoaderData() as AdminUser[];

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Members (Admin)</h2>
        <Form action="/auth/logout" method="post">
          <Button type="submit" variant="outline">
            Logout
          </Button>
        </Form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">User ID</th>
              <th className="py-2">Role</th>
              <th className="py-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-b" key={user.user_id}>
                <td className="py-2">{user.user_id}</td>
                <td className="py-2">{user.is_admin ? "admin" : "member"}</td>
                <td className="py-2">{new Date(user.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  if (error instanceof Error) {
    return (
      <section>
        <h2>Unexpected Application Error</h2>
        <p>{error.message}</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Unexpected Application Error</h2>
      <p>Unknown error</p>
    </section>
  );
}

export function CapturePage() {
  return <p className="text-sm text-muted-foreground">Camera/Mic capture UI will be implemented after auth.</p>;
}

