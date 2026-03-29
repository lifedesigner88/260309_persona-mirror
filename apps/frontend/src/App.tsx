import { type ReactNode, useEffect, useRef } from "react";
import {
  NavLink,
  Outlet,
  isRouteErrorResponse,
  useLocation,
  useLoaderData,
  useRouteError
} from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LangToggle, ShellCard, StatusPill } from "@/common/components";
import { LogoutButton, type RootLoaderData } from "@/features/auth";
import { KAKAO_OPEN_CHAT_URL, NAVER_BLOG_URL, PROJECT_GITHUB_URL } from "@/lib/contact";
import { cn } from "@/lib/utils";

type NavigationItem = {
  to: string;
  label: string;
  disabled?: boolean;
  hoverTitle?: string;
};

const FEATURED_NAV_BASE =
  "rounded-2xl border px-4 py-3.5 text-sm leading-5 transition shadow-[0_8px_22px_rgba(15,23,42,0.04)]";

function getNavigationItemClasses(item: NavigationItem, isActive: boolean): string {
  if (item.to === "/") {
    return cn(
      FEATURED_NAV_BASE,
      "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(236,253,245,0.92))] font-medium text-emerald-950 hover:border-emerald-300/80 hover:bg-emerald-50/92 hover:text-emerald-950",
      isActive && "ring-1 ring-emerald-300/80 shadow-[0_12px_26px_rgba(16,185,129,0.12)]"
    );
  }

  if (item.to === "/ai/sejong") {
    return cn(
      FEATURED_NAV_BASE,
      "border-rose-300/80 bg-[linear-gradient(135deg,rgba(255,241,242,1),rgba(255,247,237,0.98))] font-medium text-rose-950 hover:border-rose-400/80 hover:bg-[linear-gradient(135deg,rgba(255,241,242,1),rgba(255,251,235,1))] hover:text-rose-950",
      isActive && "ring-1 ring-rose-300/90 shadow-[0_14px_28px_rgba(244,63,94,0.14)]"
    );
  }

  if (item.to === "/persona/sejong") {
    return cn(
      FEATURED_NAV_BASE,
      "border-violet-200/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(250,245,255,0.94))] font-medium text-violet-950 hover:border-violet-300/85 hover:bg-[linear-gradient(135deg,rgba(243,232,255,0.98),rgba(250,245,255,0.98))] hover:text-violet-950",
      isActive && "ring-1 ring-violet-300/85 shadow-[0_12px_26px_rgba(139,92,246,0.14)]"
    );
  }

  if (item.to === "/team-fit") {
    return cn(
      FEATURED_NAV_BASE,
      "border-emerald-200/80 bg-[linear-gradient(135deg,rgba(240,253,244,0.98),rgba(236,253,245,0.92))] font-medium text-emerald-950 hover:border-emerald-300/80 hover:bg-emerald-50/92 hover:text-emerald-950",
      isActive && "ring-1 ring-emerald-300/80 shadow-[0_12px_26px_rgba(16,185,129,0.12)]"
    );
  }

  if (item.to === "/seoul/dashboard") {
    return cn(
      FEATURED_NAV_BASE,
      "border-sky-200/75 bg-[linear-gradient(135deg,rgba(249,250,251,0.98),rgba(240,249,255,0.9))] font-medium text-sky-900 hover:border-sky-300/75 hover:bg-sky-50/92 hover:text-sky-950",
      isActive && "ring-1 ring-sky-200/80 shadow-[0_10px_24px_rgba(56,189,248,0.1)]"
    );
  }

  return cn(
    "rounded-2xl px-4 py-3 text-sm font-medium transition",
    isActive
      ? "bg-foreground text-background shadow-sm"
      : "text-foreground/75 hover:bg-black/5 hover:text-foreground"
  );
}

function NaverBlogIcon() {
  return <span className="text-[15px] font-black">N</span>;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function KakaoTalkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M12 4c-4.97 0-9 3.019-9 6.742 0 2.442 1.736 4.58 4.332 5.756L6.25 20l4.012-2.095c.566.084 1.145.126 1.738.126 4.97 0 9-3.02 9-6.743C21 7.02 16.97 4 12 4Z"
      />
      <circle cx="8.45" cy="10.75" r="1.05" fill="#FEE500" />
      <circle cx="12" cy="10.75" r="1.05" fill="#FEE500" />
      <circle cx="15.55" cy="10.75" r="1.05" fill="#FEE500" />
    </svg>
  );
}

type SidebarActionLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  cardClassName: string;
  iconClassName: string;
  labelClassName: string;
};

function SidebarActionLink({
  href,
  label,
  icon,
  cardClassName,
  iconClassName,
  labelClassName
}: SidebarActionLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        cardClassName
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          iconClassName
        )}
      >
        {icon}
      </span>
      <span className={cn("text-sm font-semibold transition", labelClassName)}>{label}</span>
    </a>
  );
}

export function App() {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const { sessionUser } = useLoaderData() as RootLoaderData;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const navigationItems: NavigationItem[] = [
    { to: "/", label: t("nav.teamFitExplorer") },
    { to: "/persona/sejong", label: t("nav.sejongPersona") },
    { to: "/ai/sejong", label: t("nav.sejongAiChat") },
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
    ...(!sessionUser
      ? [
          { to: "/auth/login", label: t("nav.login") },
          { to: "/auth/signup", label: t("nav.signup") }
        ]
      : []),
    ...(sessionUser?.is_admin
      ? [
          { to: "/admin/users", label: t("nav.adminUsers") },
          { to: "/admin/verifications", label: t("nav.adminVerifications") }
        ]
      : []),
    { to: "/seoul/dashboard", label: t("nav.dashboardSeoul") },
    {
      to: "/busan/dashboard",
      label: t("nav.dashboardBusan"),
      disabled: true,
      hoverTitle: t("nav.comingSoon")
    }
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

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
              <StatusPill label={t("sidebar.phase")} tone="warn" />
              <LangToggle />
            </div>
            <div className="mt-6 space-y-4 pb-1">
              <NavLink to="/" className="group block rounded-3xl">
                <div className="flex items-center gap-3">
                  <img
                    src="/asm17_logo.png"
                    alt="ASM 17 logo"
                    className="h-14 w-14 shrink-0 object-contain"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-slate-950 transition group-hover:text-slate-700">
                      {t("sidebar.brandTitle")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {t("sidebar.brandSubtitle")}
                    </p>
                  </div>
                </div>
              </NavLink>
            </div>
            <nav className="mt-7 grid gap-2.5">
              {navigationItems.map((item) =>
                item.disabled ? (
                  <span
                    key={item.to}
                    aria-disabled="true"
                    title={item.hoverTitle}
                    className="flex cursor-not-allowed items-center justify-between gap-2 rounded-2xl border border-dashed border-slate-200/90 bg-slate-100/78 px-4 py-3.5 text-sm font-medium text-slate-400 shadow-inner transition"
                  >
                    <span>{item.label}</span>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] text-slate-400">
                      {item.hoverTitle}
                    </span>
                  </span>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => getNavigationItemClasses(item, isActive)}
                    end={item.to === "/"}
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </nav>
            <div className="mt-7 space-y-2.5 rounded-2xl border border-black/5 bg-white/70 p-4 text-sm">
              {sessionUser ? (
                <LogoutButton className="w-full rounded-2xl border border-stone-200 bg-white/88 px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-white" />
              ) : null}
              <SidebarActionLink
                href={KAKAO_OPEN_CHAT_URL}
                label={t("sidebar.directInquiry")}
                icon={<KakaoTalkIcon />}
                cardClassName="border-[#E7D486]/75 bg-[#FFF8DE]/88 hover:border-[#D8BF64] hover:bg-[#FFF3C7]"
                iconClassName="border-[#E8D78F] bg-[#FFF1A6] text-[#3A2E10]"
                labelClassName="text-[#4A3B18] group-hover:text-[#3C3116]"
              />
              <SidebarActionLink
                href={NAVER_BLOG_URL}
                label={t("sidebar.blogLabel")}
                icon={<NaverBlogIcon />}
                cardClassName="border-emerald-200/80 bg-emerald-50/72 hover:border-emerald-300 hover:bg-emerald-50/90"
                iconClassName="border-emerald-200/80 bg-white/82 text-[#03C75A]"
                labelClassName="text-slate-800 group-hover:text-emerald-800"
              />
              <SidebarActionLink
                href={PROJECT_GITHUB_URL}
                label={t("sidebar.projectGithubLabel")}
                icon={<GitHubIcon />}
                cardClassName="border-slate-200/85 bg-slate-50/78 hover:border-slate-300 hover:bg-white"
                iconClassName="border-slate-200/80 bg-white/82 text-slate-700"
                labelClassName="text-slate-800 group-hover:text-slate-700"
              />
            </div>
          </ShellCard>
        </aside>

        <div ref={contentRef} className="space-y-6">
          <Outlet />
        </div>
      </div>
    </main>
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
