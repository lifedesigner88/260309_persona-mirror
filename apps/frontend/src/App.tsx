import {
  Form,
  NavLink,
  Outlet,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError
} from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type HealthLoaderData = { initialStatus: string };
type HealthActionData = { result: string };
type AuthActionData = { error?: string };
type AdminUser = { user_id: string; is_admin: boolean; created_at: string };
type RootLoaderData = { sessionUser: AdminUser | null };

function ShellCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/60 bg-card/95 p-6 shadow-[0_24px_80px_-36px_rgba(30,41,59,0.45)] backdrop-blur",
        className
      )}
    >
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-foreground/80">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function AuthInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition",
        "placeholder:text-muted-foreground/70 focus:border-foreground/30 focus:bg-white focus:ring-4 focus:ring-foreground/5",
        props.className
      )}
    />
  );
}

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warn" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium tracking-wide", toneClass)}>
      {label}
    </span>
  );
}

async function requestHealthStatus(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  const data = (await response.json()) as { status?: string };
  return data.status ?? "unknown";
}

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
    sessionUser: (await response.json()) as AdminUser,
  };
}

export function App() {
  const { sessionUser } = useLoaderData() as RootLoaderData;
  const navigationItems = [
    { to: "/", label: "Overview" },
    { to: "/auth/signup", label: "Sign up" },
    { to: "/auth/login", label: "Login" },
    ...(sessionUser?.is_admin ? [{ to: "/admin/users", label: "Admin users" }] : []),
    { to: "/capture", label: "Capture" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <ShellCard className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,241,235,0.92))]">
            <StatusPill label="Phase 1 starter" />
            <div className="mt-4 space-y-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground">
                PersonaMirror
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Identity capture starter for auth, admin access, and the first multimodal workflow shell.
              </p>
            </div>
            <nav className="mt-8 grid gap-2">
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-2xl px-4 py-3 text-sm font-medium transition",
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-foreground/75 hover:bg-black/5 hover:text-foreground"
                    )
                  }
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-8 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Current baseline</span>
                <StatusPill
                  label={sessionUser ? (sessionUser.is_admin ? "admin session" : "member session") : "guest"}
                  tone={sessionUser?.is_admin ? "success" : "default"}
                />
              </div>
              <div className="mt-2 text-foreground">Auth, admin list, DB seed, and dev runtime are already wired.</div>
            </div>
          </ShellCard>
        </aside>

        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
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
  const tone = result === "ok" ? "success" : result === "request failed" ? "warn" : "default";

  return (
    <div className="space-y-6">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,244,238,0.96))]">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <StatusPill label="Starter overview" />
            <div className="space-y-3">
              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Solid enough to build the real persona flow without redoing the foundation later.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Auth, admin permission boundaries, Postgres wiring, React Router data APIs, and local dev orchestration are already aligned.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Form method="post">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? "Checking backend..." : "Check backend health"}
                </Button>
              </Form>
              <NavLink to="/auth/signup">
                <Button size="lg" variant="outline">
                  Create test account
                </Button>
              </NavLink>
            </div>
          </div>

          <div className="rounded-[22px] border border-black/5 bg-white/80 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Runtime signal
              </span>
              <StatusPill label={result} tone={tone} />
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                <dt className="text-muted-foreground">Backend API</dt>
                <dd className="font-medium text-foreground">{API_BASE_URL}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                <dt className="text-muted-foreground">Auth mode</dt>
                <dd className="font-medium text-foreground">httpOnly cookie</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Health state</dt>
                <dd className="font-medium text-foreground">{result}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ShellCard>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Auth baseline",
            text: "Sign up, login, logout, admin session checks, and seeded admin access are already connected.",
          },
          {
            title: "UI direction",
            text: "Tailwind + shadcn/ui is in place so the next screens can stay consistent without redoing primitives.",
          },
          {
            title: "Next step",
            text: "The natural follow-up is interview input, media upload flow, and async generation orchestration.",
          },
        ].map((item) => (
          <ShellCard key={item.title} className="bg-white/88 p-5">
            <h3 className="text-base font-semibold tracking-[-0.02em]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
          </ShellCard>
        ))}
      </div>
    </div>
  );
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

export function SignupPage() {
  const actionData = useActionData() as AuthActionData | undefined;

  return (
    <ShellCard className="mx-auto max-w-xl bg-white/92">
      <div className="space-y-2">
        <StatusPill label="New member" />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Create a local test identity</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This creates a normal member account. Admin access remains reserved for the seeded operator account.
        </p>
      </div>
      <Form className="mt-6 space-y-4" method="post">
        <Field label="User ID">
          <AuthInput autoComplete="username" name="user_id" required />
        </Field>
        <Field label="Password">
          <AuthInput autoComplete="new-password" minLength={8} name="password" required type="password" />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Use 8+ characters. This account is for local dev testing.</p>
          <Button type="submit">Create account</Button>
        </div>
      </Form>
      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
        </div>
      ) : null}
    </ShellCard>
  );
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

export function LoginPage() {
  const actionData = useActionData() as AuthActionData | undefined;

  return (
    <ShellCard className="mx-auto max-w-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,248,0.95))]">
      <div className="space-y-2">
        <StatusPill label="Session access" />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Sign in to continue</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Session state is stored in an httpOnly cookie, so the browser cannot read the token directly.
        </p>
      </div>
      <Form className="mt-6 space-y-4" method="post">
        <Field label="User ID">
          <AuthInput autoComplete="username" name="user_id" required />
        </Field>
        <Field label="Password">
          <AuthInput autoComplete="current-password" minLength={8} name="password" required type="password" />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Seeded admin is documented in the project env template.</p>
          <Button type="submit">Login</Button>
        </div>
      </Form>
      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
        </div>
      ) : null}
    </ShellCard>
  );
}

export async function logoutAction(): Promise<Response> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return redirect("/");
}

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
            <Form action="/auth/logout" method="post">
              <Button type="submit" variant="outline">
                Logout
              </Button>
            </Form>
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

export function RouteErrorBoundary() {
  const error = useRouteError();
  if (error instanceof Error) {
    return (
      <ShellCard className="mx-auto max-w-2xl border-red-200 bg-red-50/90">
        <StatusPill label="Route error" tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">Unexpected application error</h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </ShellCard>
    );
  }

  return (
    <ShellCard className="mx-auto max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">Unexpected application error</h2>
      <p className="mt-3 text-sm text-muted-foreground">Unknown error</p>
    </ShellCard>
  );
}

export function CapturePage() {
  return (
    <ShellCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,243,238,0.96))]">
      <StatusPill label="Next milestone" />
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">Capture workflow placeholder</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        Camera, microphone, and interview input screens will be added here after the auth and admin baseline is stable.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["Interview prompt flow", "Voice upload + tone analysis", "Image/reference capture"].map((item) => (
          <div key={item} className="rounded-2xl border border-black/5 bg-white/80 px-4 py-5 text-sm text-foreground">
            {item}
          </div>
        ))}
      </div>
    </ShellCard>
  );
}
