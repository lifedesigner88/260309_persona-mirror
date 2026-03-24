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

type HealthLoaderData = { initialStatus: string; initialDurationMs: number | null };
type HealthActionData = { result: string; durationMs: number | null };
type NavigationItem = {
  to: string;
  label: string;
  disabled?: boolean;
  hoverTitle?: string;
};
type HomeStep = {
  title: string;
  text: string;
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

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function App() {
  const { t, i18n } = useTranslation("common");
  const { sessionUser } = useLoaderData() as RootLoaderData;
  const navigationItems: NavigationItem[] = [
    { to: "/seoul/dashboard", label: t("nav.dashboardSeoul") },
    {
      to: "/busan/dashboard",
      label: t("nav.dashboardBusan"),
      disabled: true,
      hoverTitle: t("nav.comingSoon")
    },
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
            label:
              sessionUser.applicant_status === "approved"
                ? t("nav.editVerification")
                : t("nav.cohortVerification")
          }
        ]
      : []),
    ...(sessionUser?.is_admin
      ? [
          { to: "/admin/users", label: t("nav.adminUsers") },
          { to: "/admin/verifications", label: t("nav.adminVerifications") }
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
            <div className="mt-4">
              <NavLink
                to="/home"
                className="group inline-flex w-full items-center gap-3 rounded-3xl"
                end
              >
                <img
                  src="/asm17_logo.png"
                  alt="ASM 17 logo"
                  className="h-14 w-14 shrink-0 object-contain"
                />
                <p className="min-w-0 text-sm font-medium leading-5 text-foreground/78 transition group-hover:text-foreground">
                  {t("sidebar.tagline")}
                </p>
              </NavLink>
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
                {t("sidebar.openChat")}
              </a>
              <a
                href={KAKAO_OPEN_CHAT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E7D486] bg-[#F3E19A] px-4 py-3 text-sm font-semibold text-[#3A3522] shadow-sm transition hover:bg-[#ECD67E]"
              >
                {t("sidebar.directInquiry")}
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
  return { initialStatus: "not checked", initialDurationMs: null };
}

export async function homeAction(): Promise<HealthActionData> {
  const startedAt = nowMs();
  try {
    const result = await requestHealthStatus();
    return { result, durationMs: Math.max(0, Math.round(nowMs() - startedAt)) };
  } catch {
    return {
      result: "request failed",
      durationMs: Math.max(0, Math.round(nowMs() - startedAt))
    };
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
  const durationMs = actionData?.durationMs ?? loaderData.initialDurationMs;
  const tone = result === "ok" ? "success" : result === "request failed" ? "warn" : "default";
  const statusLabel =
    result === "ok"
      ? t("home.runtimeStatusOk")
      : result === "request failed"
        ? t("home.runtimeStatusFailed")
        : t("home.runtimeStatusIdle");
  const sessionUser = rootData.sessionUser;
  const keywords = t("home.keywords", {
    returnObjects: true,
    defaultValue: []
  }) as string[];
  const flowSteps = t("home.flowSteps", {
    returnObjects: true,
    defaultValue: []
  }) as HomeStep[];
  const featureItems = t("home.featureItems", {
    returnObjects: true,
    defaultValue: []
  }) as string[];
  const featuresSummary = t("home.featuresSummary");
  const futureSummary = t("home.futureSummary");
  const futureItems = t("home.futureItems", {
    returnObjects: true,
    defaultValue: []
  }) as string[];
  const flowAccentClasses = [
    "bg-amber-500",
    "bg-rose-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-slate-800"
  ];
  const keywordClasses = [
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-sky-200 bg-sky-50 text-sky-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-slate-200 bg-slate-50 text-slate-800"
  ];

  return (
    <div className="space-y-6">
      <ShellCard className="relative overflow-hidden border-white/70 bg-[linear-gradient(135deg,rgba(255,251,244,0.98),rgba(241,249,245,0.96))] p-0">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-24px] right-[-18px] h-44 w-44 rounded-full bg-amber-300/45 blur-3xl" />
          <div className="absolute bottom-[-30px] left-[-12px] h-40 w-40 rounded-full bg-emerald-300/45 blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-sky-200/25 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
        </div>
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.24fr_0.76fr] lg:p-8">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <StatusPill label={t("home.pill")} />
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

            <div className="space-y-3.5">
              <h2 className="max-w-3xl text-[1.55rem] font-semibold tracking-[-0.05em] text-foreground sm:text-[1.75rem] lg:text-[1.95rem]">
                {t("home.heading")}
              </h2>
              <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground sm:text-sm">
                {t("home.description")}
              </p>
              <p className="inline-flex max-w-full rounded-full border border-emerald-200/80 bg-emerald-50/85 px-3 py-1.5 text-[11px] font-semibold text-emerald-900">
                {t("home.visibilityNote")}
              </p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={keyword}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em]",
                      keywordClasses[index % keywordClasses.length]
                    )}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-[250px] rounded-[20px] border border-dashed border-slate-300/80 bg-white/82 p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("home.runtimeLabel")}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold tracking-[-0.03em] text-slate-950">
                    {t("home.runtimeTitle")}
                  </h3>
                </div>
                <StatusPill label={statusLabel} tone={tone} />
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("home.runtimeLatency")}
                </div>
                <div className="mt-1 text-[1.15rem] font-semibold tracking-[-0.04em] text-slate-950">
                  {durationMs == null
                    ? t("home.runtimeLatencyIdle")
                    : t("home.runtimeLatencyValue", { ms: durationMs })}
                </div>
              </div>

              <div className="mt-3">
                <Form method="post">
                  <Button
                    type="submit"
                    disabled={loading}
                    size="sm"
                    variant="outline"
                    className="w-full rounded-full"
                  >
                    {loading ? t("home.runtimeButtonLoading") : t("home.runtimeButton")}
                  </Button>
                </Form>
              </div>
            </div>
          </div>
        </div>
      </ShellCard>

      <ShellCard className="bg-white/90">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t("home.flowLabel")}
            </div>
            <h3 className="mt-2.5 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
              {t("home.flowTitle")}
            </h3>
          </div>
        </div>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flowSteps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(248,250,252,0.96))] px-4 py-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white",
                    flowAccentClasses[index % flowAccentClasses.length]
                  )}
                >
                  {index + 1}
                </span>
                <h4 className="text-sm font-semibold tracking-[-0.02em] text-slate-950">
                  {step.title}
                </h4>
              </div>
              <p className="mt-2.5 text-[13px] leading-5 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </ShellCard>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <ShellCard className="bg-[linear-gradient(160deg,rgba(248,250,252,0.98),rgba(255,255,255,0.95))]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {t("home.featuresLabel")}
          </div>
          <h3 className="mt-2.5 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
            {t("home.featuresTitle")}
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{featuresSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {featureItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200/80 bg-white/84 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </ShellCard>

        <ShellCard className="bg-[linear-gradient(160deg,rgba(240,246,255,0.98),rgba(255,250,240,0.96))]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700/80">
            {t("home.futureLabel")}
          </div>
          <h3 className="mt-2.5 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
            {t("home.futureTitle")}
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{futureSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {futureItems.map((item) => (
              <span
                key={item}
                className="rounded-full border border-sky-200/80 bg-white/84 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </ShellCard>
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
