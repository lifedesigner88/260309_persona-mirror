import {
  Form,
  NavLink,
  Outlet,
  isRouteErrorResponse,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
  useRouteError
} from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import { LogoutButton, type RootLoaderData } from "@/features/auth";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type HealthLoaderData = { initialStatus: string };
type HealthActionData = { result: string };

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

export function App() {
  const { sessionUser } = useLoaderData() as RootLoaderData;
  const navigationItems = [
    { to: "/", label: "Overview" },
    ...(!sessionUser ? [{ to: "/auth/signup", label: "Sign up" }, { to: "/auth/login", label: "Login" }] : []),
    ...(sessionUser?.is_admin ? [{ to: "/admin/users", label: "Admin users" }] : []),
    { to: "/capture", label: "Capture" },
    ...(sessionUser ? [{ to: "/capture/submissions", label: "My submissions" }] : []),
    { to: "/persona/demo", label: "Demo Persona" },
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
              <div className="mt-3 rounded-2xl border border-border/70 bg-white/80 px-3 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Session</div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {sessionUser ? `Signed in as ${sessionUser.user_id}` : "Not signed in"}
                </div>
                {sessionUser ? (
                  <div className="mt-3">
                    <LogoutButton className="w-full" />
                  </div>
                ) : null}
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
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const actionData = useActionData() as HealthActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const result = actionData?.result ?? loaderData.initialStatus;
  const tone = result === "ok" ? "success" : result === "request failed" ? "warn" : "default";
  const sessionUser = rootData.sessionUser;

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
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill
                  label={sessionUser ? `logged in: ${sessionUser.user_id}` : "guest mode"}
                  tone={sessionUser ? "success" : "default"}
                />
                {sessionUser?.is_admin ? <StatusPill label="admin access" tone="success" /> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Form method="post">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? "Checking backend..." : "Check backend health"}
                </Button>
              </Form>
              {sessionUser ? (
                <LogoutButton />
              ) : (
                <>
                  <NavLink to="/auth/signup">
                    <Button size="lg" variant="outline">
                      Create test account
                    </Button>
                  </NavLink>
                  <NavLink to="/auth/login">
                    <Button size="lg" variant="outline">
                      Login
                    </Button>
                  </NavLink>
                </>
              )}
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

export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <ShellCard className="mx-auto max-w-2xl border-amber-200 bg-amber-50/90">
        <StatusPill label={`Route ${error.status}`} tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{error.statusText || "Route error"}</h2>
        <p className="mt-3 text-sm leading-6 text-amber-900">{typeof error.data === "string" ? error.data : "The requested page could not be loaded."}</p>
      </ShellCard>
    );
  }

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
