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
import { useTranslation } from "react-i18next";

import { Button, LangToggle, ShellCard, StatusPill } from "@/common/components";
import { LogoutButton, type RootLoaderData } from "@/features/auth";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type HealthLoaderData = { initialStatus: string };
type HealthActionData = { result: string };
type NavigationItem = {
  to: string;
  label: string;
  disabled?: boolean;
  hoverTitle?: string;
};

async function requestHealthStatus(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    credentials: "include"
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  const data = (await response.json()) as { status?: string };
  return data.status ?? "unknown";
}

export function App() {
  const { t, i18n } = useTranslation("common");
  const { sessionUser } = useLoaderData() as RootLoaderData;
  const navigationItems: NavigationItem[] = [
    { to: "/dashboard", label: "대시보드 - 서울" },
    { to: "/dashboard/busan", label: "대시보드 - 부산", disabled: true, hoverTitle: "Coming soon" },
    ...(!sessionUser
      ? [
          { to: "/auth/signup", label: t("nav.signup") },
          { to: "/auth/login", label: t("nav.login") }
        ]
      : []),
    ...(sessionUser
      ? [
          {
            to: "/verification",
            label: sessionUser.applicant_status === "approved" ? "내 인증정보 수정" : "합격자 인증"
          }
        ]
      : []),
    ...(sessionUser?.is_admin
      ? [
          { to: "/admin/users", label: t("nav.adminUsers") },
          { to: "/admin/verifications", label: "인증 관리" }
        ]
      : []),
    // Capture navigation is intentionally hidden for now.
    // We'll bring this tab back later when persona-based team-building features are prioritized again.
    { to: "/persona/sejong", label: t("nav.sejongPersona") }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <ShellCard
            className="overflow-hidden transition-all duration-500"
            style={{
              background:
                i18n.resolvedLanguage === "ko"
                  ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(252,241,240,0.92))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(235,241,255,0.92))"
            }}
          >
            <div className="flex items-center justify-between">
              <StatusPill label={t("sidebar.phase")} />
              <LangToggle />
            </div>
            <div className="mt-4 space-y-3">
              <NavLink to="/" className="group inline-flex w-fit flex-col" end>
                <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-foreground transition group-hover:text-foreground/85">
                  <span className="block">ASM 17</span>
                  <span className="mt-1 block">Community</span>
                </h1>
              </NavLink>
              <p className="text-sm leading-6 text-muted-foreground">{t("sidebar.tagline")}</p>
            </div>
            <nav className="mt-8 grid gap-2">
              {navigationItems.map((item) =>
                item.disabled ? (
                  <span
                    key={item.to}
                    aria-disabled="true"
                    title={item.hoverTitle}
                    className="cursor-not-allowed rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm font-medium text-foreground/40 transition hover:border-foreground/25 hover:bg-black/5"
                  >
                    {item.label}
                  </span>
                ) : (
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
                )
              )}
            </nav>
            <div className="mt-8 space-y-3 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm">
              {sessionUser ? (
                <LogoutButton className="w-full rounded-2xl border border-stone-200 bg-white/88 px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-white" />
              ) : null}
              <a
                href={KAKAO_OPEN_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl px-1 text-sm text-muted-foreground transition hover:text-foreground"
              >
                오픈채팅방 바로가기
              </a>
              <a
                href={KAKAO_OPEN_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E7D486] bg-[#F3E19A] px-4 py-3 text-sm font-semibold text-[#3A3522] shadow-sm transition hover:bg-[#ECD67E]"
              >
                1:1 문의하기
              </a>
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
  const { t } = useTranslation("common");
  const loaderData = useLoaderData() as HealthLoaderData;
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const actionData = useActionData() as HealthActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const result = actionData?.result ?? loaderData.initialStatus;
  const tone = result === "ok" ? "success" : result === "request failed" ? "warn" : "default";
  const sessionUser = rootData.sessionUser;

  const cards = [
    { title: t("home.cards.authTitle"), text: t("home.cards.authText") },
    { title: t("home.cards.uiTitle"), text: t("home.cards.uiText") },
    { title: t("home.cards.nextTitle"), text: t("home.cards.nextText") }
  ];

  return (
    <div className="space-y-6">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,244,238,0.96))]">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <StatusPill label={t("home.pill")} />
            <div className="space-y-3">
              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {t("home.heading")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("home.description")}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill
                  label={
                    sessionUser
                      ? t("home.loggedIn", { userId: sessionUser.user_id })
                      : t("home.guestMode")
                  }
                  tone={sessionUser ? "success" : "default"}
                />
                {sessionUser?.is_admin ? (
                  <StatusPill label={t("home.adminAccess")} tone="success" />
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Form method="post">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? t("home.checkingBackend") : t("home.checkBackend")}
                </Button>
              </Form>
              {sessionUser ? (
                <LogoutButton />
              ) : (
                <>
                  <NavLink to="/auth/signup">
                    <Button size="lg" variant="outline">
                      {t("home.createAccount")}
                    </Button>
                  </NavLink>
                  <NavLink to="/auth/login">
                    <Button size="lg" variant="outline">
                      {t("nav.login")}
                    </Button>
                  </NavLink>
                </>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-black/5 bg-white/80 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("home.runtimeSignal")}
              </span>
              <StatusPill label={result} tone={tone} />
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                <dt className="text-muted-foreground">{t("home.backendApi")}</dt>
                <dd className="font-medium text-foreground">{API_BASE_URL}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
                <dt className="text-muted-foreground">{t("home.authMode")}</dt>
                <dd className="font-medium text-foreground">{t("home.authModeValue")}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">{t("home.healthState")}</dt>
                <dd className="font-medium text-foreground">{result}</dd>
              </div>
            </dl>
          </div>
        </div>
      </ShellCard>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((item) => (
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
  const { t } = useTranslation("common");
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <ShellCard className="mx-auto max-w-2xl border-amber-200 bg-amber-50/90">
        <StatusPill label={`${t("error.routeError")} ${error.status}`} tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          {error.statusText || t("error.routeError")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-amber-900">
          {typeof error.data === "string" ? error.data : t("error.pageNotLoaded")}
        </p>
      </ShellCard>
    );
  }

  if (error instanceof Error) {
    return (
      <ShellCard className="mx-auto max-w-2xl border-red-200 bg-red-50/90">
        <StatusPill label={t("error.routeError")} tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          {t("error.unexpectedError")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-red-800">{error.message}</p>
      </ShellCard>
    );
  }

  return (
    <ShellCard className="mx-auto max-w-2xl">
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("error.unexpectedError")}</h2>
      <p className="mt-3 text-sm text-muted-foreground">{t("error.unknownError")}</p>
    </ShellCard>
  );
}
