import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, ShellCard, StatusPill } from "@/common/components";
import type { RootLoaderData } from "@/features/auth/types";
import { formatInterviewTimeSlot } from "@/lib/interview";
import { fetchDashboard, fetchSlotMembers, updateMemberCheck } from "../api";
import type { DashboardGrid, MemberCard, SlotCell } from "../types";

const INTERVIEW_DATES = ["2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"];
type AppLanguage = "en" | "ko";

const DATE_LABELS: Record<AppLanguage, Record<string, string>> = {
  ko: {
    "2026-03-19": "3/19 (목)",
    "2026-03-20": "3/20 (금)",
    "2026-03-21": "3/21 (토)",
    "2026-03-22": "3/22 (일)"
  },
  en: {
    "2026-03-19": "3/19 (Thu)",
    "2026-03-20": "3/20 (Fri)",
    "2026-03-21": "3/21 (Sat)",
    "2026-03-22": "3/22 (Sun)"
  }
};
const MOBILE_DATE_GROUPS = [
  ["2026-03-19", "2026-03-20"],
  ["2026-03-21", "2026-03-22"]
] as const;
const ROOMS = [1, 2, 3, 4, 5];
const DISPLAY_COLUMNS = 5;
const COMMUNITY_TARGET_MEMBERS = 300;
const WORKSHOP_START_AT = new Date("2026-04-03T13:00:00+09:00").getTime();
const DEMO_CARD_SEEN_STORAGE_KEY = "asm17:demo-card:seen";

type SelectedSlot = { date: string; timeSlot: number; room: number };
type SlotSummary = { filled: number; male: number; female: number };
type CountdownParts = { days: number; hours: number; minutes: number; seconds: number };
type SlotDialogCard = MemberCard & { previewState?: "demo" | "locked" };

const DEMO_PREVIEW_CARDS: SlotDialogCard[] = [
  {
    seat: 1,
    user_id: 1,
    name: "박세종",
    birth_year: 1988,
    residence: "서울시 은평구",
    gender: "M",
    email: "lifedesigner88@gmail.com",
    github_address: "https://github.com/lifedesigner88",
    notion_url: "https://leq88.notion.site/17-ee16712aabe583dda7d60117e4c87ad1",
    previewState: "demo"
  },
  ...Array.from({ length: 4 }, (_, index) => ({
    seat: index + 2,
    user_id: -1 * (index + 2),
    name: null,
    birth_year: null,
    residence: null,
    gender: null,
    email: null,
    github_address: null,
    notion_url: null,
    previewState: "locked" as const
  }))
];

function slotKey(date: string, timeSlot: number, room: number) {
  return `${date}|${timeSlot}|${room}`;
}

function normalizeLanguage(language: string | undefined): AppLanguage {
  return language === "ko" ? "ko" : "en";
}

function getDateLabel(date: string, language: string | undefined) {
  return DATE_LABELS[normalizeLanguage(language)][date] ?? date;
}

function slotSummary(cells: SlotCell[]): SlotSummary {
  return {
    filled: cells.filter((cell) => cell.color !== "gray").length,
    male: cells.filter((cell) => cell.color === "blue").length,
    female: cells.filter((cell) => cell.color === "pink").length
  };
}

function getCountdownParts(now: number): CountdownParts {
  const diffMs = Math.max(0, WORKSHOP_START_AT - now);
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function toneClass(date: string, summary: SlotSummary, isSelected: boolean) {
  if (isSelected) {
    if (date === "2026-03-21") {
      return {
        card: "border-sky-300 bg-sky-300/80 text-sky-950 shadow-md",
        meta: "text-sky-950/75"
      };
    }

    if (date === "2026-03-22") {
      return {
        card: "border-rose-300 bg-rose-300/80 text-rose-950 shadow-md",
        meta: "text-rose-950/75"
      };
    }

    return {
      card: "border-lime-300 bg-lime-200/85 text-lime-950 shadow-md",
      meta: "text-lime-950/75"
    };
  }

  if (summary.filled === 0) {
    return {
      card: "border-border/60 bg-white/78 text-muted-foreground hover:border-foreground/25 hover:bg-white",
      meta: "text-muted-foreground/75"
    };
  }

  if (summary.male > 0 && summary.female > 0) {
    return {
      card: "border-amber-200 bg-amber-50/90 text-amber-700 hover:border-amber-300",
      meta: "text-amber-700/80"
    };
  }

  if (summary.male > 0) {
    return {
      card: "border-sky-200 bg-sky-50/90 text-sky-700 hover:border-sky-300",
      meta: "text-sky-700/80"
    };
  }

  return {
    card: "border-pink-200 bg-pink-50/90 text-pink-700 hover:border-pink-300",
    meta: "text-pink-700/80"
  };
}

function dotClass(color: SlotCell["color"], isSelected: boolean) {
  if (color === "blue") {
    return isSelected
      ? "border-sky-400 bg-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.26)]"
      : "border-sky-200 bg-sky-200";
  }

  if (color === "pink") {
    return isSelected
      ? "border-rose-400 bg-rose-100 shadow-[0_0_0_1px_rgba(251,113,133,0.24)]"
      : "border-rose-200 bg-rose-200";
  }

  return isSelected ? "border-lime-300 bg-lime-50" : "border-stone-200 bg-stone-100";
}

function timeSlotLabelClass(isActive: boolean, selectedDateForTimeSlot: string | null) {
  if (!isActive) {
    return "border-border/60 bg-white/82 text-muted-foreground hover:border-foreground/20 hover:text-foreground";
  }

  if (selectedDateForTimeSlot === "2026-03-21") {
    return "border-sky-300 bg-sky-200/85 text-sky-950 shadow-sm";
  }

  if (selectedDateForTimeSlot === "2026-03-22") {
    return "border-rose-300 bg-rose-200/85 text-rose-950 shadow-sm";
  }

  return "border-lime-300 bg-lime-200/85 text-lime-950 shadow-sm";
}

function dateHeaderClass(date: string) {
  if (date === "2026-03-21") {
    return "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(247,250,252,0.94))]";
  }

  if (date === "2026-03-22") {
    return "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(250,247,247,0.94))]";
  }

  return "border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,248,250,0.92))]";
}

function timeSlotBoardClass(date: string, isActive: boolean) {
  if (date === "2026-03-21") {
    return isActive ? "border-sky-200 bg-sky-100/80 shadow-sm" : "border-sky-100/80 bg-sky-50/55";
  }

  if (date === "2026-03-22") {
    return isActive
      ? "border-rose-200 bg-rose-100/80 shadow-sm"
      : "border-rose-100/80 bg-rose-50/55";
  }

  return isActive
    ? "border-foreground/15 bg-foreground/[0.04] shadow-sm"
    : "border-border/50 bg-white/72";
}

function DepartmentRowButton({
  date,
  dateLabel,
  timeSlot,
  room,
  roomLabel,
  cells,
  isSelected,
  onSelect
}: {
  date: string;
  dateLabel: string;
  timeSlot: number;
  room: number;
  roomLabel: string;
  cells: SlotCell[];
  isSelected: boolean;
  onSelect: (date: string, timeSlot: number, room: number) => void;
}) {
  const summary = slotSummary(cells);
  const tone = toneClass(date, summary, isSelected);
  const visibleCells = [...cells].sort((a, b) => a.seat - b.seat).slice(0, DISPLAY_COLUMNS);

  return (
    <button
      onClick={() => onSelect(date, timeSlot, room)}
      title={`${dateLabel} ${formatInterviewTimeSlot(timeSlot)} ${roomLabel}`}
      aria-label={`${dateLabel} ${formatInterviewTimeSlot(timeSlot)} ${roomLabel}`}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-left transition ${tone.card}`}
    >
      <span className="sr-only">{roomLabel}</span>
      <div className="grid flex-1 grid-cols-5 gap-1.5">
        {visibleCells.map((cell) => (
          <span
            key={cell.seat}
            className={`h-3 w-3 rounded-full border transition sm:h-3.5 sm:w-3.5 ${dotClass(
              cell.color,
              isSelected
            )}`}
          />
        ))}
      </div>
    </button>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 7.5h16v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m5 8 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 .5C5.648.5.5 5.648.5 12c0 5.082 3.292 9.387 7.862 10.91.575.105.787-.25.787-.556 0-.275-.01-1.004-.016-1.97-3.197.694-3.873-1.54-3.873-1.54-.523-1.328-1.277-1.681-1.277-1.681-1.044-.714.079-.699.079-.699 1.155.081 1.763 1.187 1.763 1.187 1.027 1.76 2.695 1.252 3.35.957.103-.744.402-1.252.732-1.54-2.552-.29-5.236-1.276-5.236-5.682 0-1.255.448-2.282 1.183-3.086-.119-.29-.513-1.458.112-3.04 0 0 .965-.309 3.163 1.179A11.02 11.02 0 0 1 12 6.07c.977.004 1.962.132 2.882.387 2.196-1.488 3.16-1.179 3.16-1.179.627 1.582.233 2.75.114 3.04.737.804 1.181 1.831 1.181 3.086 0 4.417-2.689 5.389-5.251 5.673.413.355.781 1.054.781 2.126 0 1.535-.014 2.773-.014 3.15 0 .309.207.667.793.554C20.213 21.383 23.5 17.08 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
    </svg>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <rect
        x="4.25"
        y="4.25"
        width="15.5"
        height="15.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M9 16V8.4l5.6 7.2V8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MemberIconLink({
  href,
  label,
  title,
  disabled = false,
  onClick,
  children
}: {
  href: string | null;
  label: string;
  title: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const baseClass =
    "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 transition";

  if (disabled || !href) {
    return (
      <span
        aria-label={title}
        title={title}
        className={`${baseClass} border-border/50 bg-white/55 text-muted-foreground/40`}
      >
        {children}
        <span className="text-[12px] font-medium">{label}</span>
      </span>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={title}
        title={title}
        className={`${baseClass} border-border/60 bg-white/72 text-foreground/78 hover:border-foreground/25 hover:bg-white hover:text-foreground`}
      >
        {children}
        <span className="text-[12px] font-medium">{label}</span>
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={title}
      title={title}
      className={`${baseClass} border-border/60 bg-white/72 text-foreground/78 hover:border-foreground/25 hover:bg-white hover:text-foreground`}
    >
      {children}
      <span className="text-[12px] font-medium">{label}</span>
    </a>
  );
}

function MemberCardItem({
  card,
  isSavingCheck = false,
  onTogglePersistedCheck
}: {
  card: SlotDialogCard;
  isSavingCheck?: boolean;
  onTogglePersistedCheck?: (card: SlotDialogCard, nextChecked: boolean) => void;
}) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);
  const [demoSeen, setDemoSeen] = useState(false);
  const inlineProfile = [card.birth_year ? `${card.birth_year}` : null, card.residence].filter(Boolean);

  useEffect(() => {
    if (card.previewState !== "demo") {
      return;
    }

    try {
      setDemoSeen(window.localStorage.getItem(DEMO_CARD_SEEN_STORAGE_KEY) === "true");
    } catch {
      setDemoSeen(false);
    }
  }, [card.previewState]);

  function copyEmail() {
    if (!card.email) return;
    navigator.clipboard.writeText(card.email).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function toggleDemoSeen() {
    const nextValue = !demoSeen;
    setDemoSeen(nextValue);

    try {
      window.localStorage.setItem(DEMO_CARD_SEEN_STORAGE_KEY, String(nextValue));
    } catch {
      // Ignore storage failures and keep the local UI state only.
    }
  }

  if (card.previewState === "locked") {
    return (
      <div className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-dashed border-pink-200 bg-pink-50/85 p-4 text-center">
        <span className="text-sm font-semibold text-pink-800">{t("dashboard.lockedLine1")}</span>
        <span className="mt-1 text-[11px] text-pink-700/80">{t("dashboard.lockedLine2")}</span>
      </div>
    );
  }

  if (!card.user_id) {
    return (
      <div className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-gray-50/90 p-4 text-center">
        <span className="text-sm font-semibold text-muted-foreground">
          {t("dashboard.memberMissingTitle")}
        </span>
        <span className="mt-1 text-[11px] text-muted-foreground/60">
          {t("dashboard.memberMissingBody")}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[188px] flex-col justify-between rounded-2xl border p-4 text-sm ${
        card.gender === "M"
          ? "border-sky-200 bg-sky-50/82"
          : card.gender === "F"
            ? "border-pink-200 bg-pink-50/82"
            : "border-border/60 bg-white/90"
      }`}
    >
      <div className="min-h-0">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground/95">
            {card.name ?? "—"}
            {inlineProfile.length > 0 && (
              <span className="text-[13px] font-medium text-muted-foreground">
                {" "}
                ({inlineProfile.join(" · ")})
              </span>
            )}
            {card.previewState === "demo" && (
              <span className="text-[12px] font-medium text-muted-foreground/80">
                {" "}
                {t("dashboard.demoSuffix")}
              </span>
            )}
          </p>

          {card.previewState === "demo" && (
            <label className="flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={demoSeen}
                onChange={toggleDemoSeen}
                aria-label={t("dashboard.demoSeenAria")}
                className="h-3.5 w-3.5 rounded border-border/60 accent-emerald-500"
              />
            </label>
          )}
          {card.previewState !== "demo" && onTogglePersistedCheck && (
            <label className="flex shrink-0 items-center">
              <input
                type="checkbox"
                checked={Boolean(card.is_checked)}
                onChange={() => onTogglePersistedCheck(card, !card.is_checked)}
                aria-label={t("dashboard.memberSeenAria")}
                disabled={isSavingCheck}
                className="h-3.5 w-3.5 rounded border-border/60 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          )}
        </div>
        {inlineProfile.length === 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">{t("dashboard.missingProfile")}</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <MemberIconLink
          href={card.email}
          label={copied ? t("dashboard.actionEmailCopied") : t("dashboard.actionEmail")}
          title={
            card.email
              ? t("dashboard.emailCopyTitle", { email: card.email })
              : t("dashboard.emailUnavailableTitle")
          }
          disabled={!card.email}
          onClick={copyEmail}
        >
          <MailIcon />
        </MemberIconLink>
        <MemberIconLink
          href={card.github_address}
          label={t("dashboard.actionGithub")}
          title={
            card.github_address
              ? t("dashboard.githubOpenTitle", { url: card.github_address })
              : t("dashboard.githubUnavailableTitle")
          }
          disabled={!card.github_address}
        >
          <GithubIcon />
        </MemberIconLink>
        <MemberIconLink
          href={card.notion_url}
          label={t("dashboard.actionNotion")}
          title={
            card.notion_url
              ? t("dashboard.notionOpenTitle", { url: card.notion_url })
              : t("dashboard.notionUnavailableTitle")
          }
          disabled={!card.notion_url}
        >
          <NotionIcon />
        </MemberIconLink>
      </div>
    </div>
  );
}

function SomaLogoCard() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-sky-200/80 bg-[linear-gradient(160deg,rgba(240,249,255,0.98),rgba(255,255,255,0.94))] p-4 text-center shadow-sm">
      <img src="/asm17_logo.png" alt={t("dashboard.logoAlt")} className="h-16 w-auto object-contain sm:h-20" />
      <div className="mt-3 text-sm font-semibold tracking-[-0.02em] text-sky-950">
        {t("dashboard.logoTitle")}
      </div>
      <div className="mt-1 text-[11px] text-sky-900/70">{t("dashboard.logoSubtitle")}</div>
    </div>
  );
}

export function DashboardPage() {
  const { t, i18n } = useTranslation("common");
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const navigate = useNavigate();
  const sessionUser = rootData.sessionUser;
  const language = normalizeLanguage(i18n.resolvedLanguage);
  const canViewSlotMembers = Boolean(
    sessionUser?.is_admin || sessionUser?.applicant_status === "approved"
  );

  const [grid, setGrid] = useState<DashboardGrid | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<number | null>(null);
  const [members, setMembers] = useState<SlotDialogCard[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMemberChecks, setSavingMemberChecks] = useState<Record<number, boolean>>({});
  const [countdown, setCountdown] = useState<CountdownParts>(() => getCountdownParts(Date.now()));

  useEffect(() => {
    fetchDashboard()
      .then(setGrid)
      .catch(() => setGrid(null))
      .finally(() => setLoadingGrid(false));
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdownParts(Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function closeSlotDialog() {
    setSelected(null);
    setMembers(null);
    setMembersError(null);
    setSavingMemberChecks({});
  }

  useEffect(() => {
    if (!selected) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSlotDialog();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [selected]);

  async function handleSlotClick(date: string, timeSlot: number, room: number) {
    setActiveTimeSlot(timeSlot);
    setSelected({ date, timeSlot, room });
    setMembers(null);
    setMembersError(null);
    setSavingMemberChecks({});
    setLoadingMembers(true);

    if (!canViewSlotMembers) {
      setLoadingMembers(false);
      setMembers(DEMO_PREVIEW_CARDS);
      return;
    }

    const result = await fetchSlotMembers(date, timeSlot, room);

    setLoadingMembers(false);
    if (result.error) {
      setMembersError(result.error);
      return;
    }

    setMembers(result.data ?? []);
  }

  async function handlePersistedCheckToggle(card: SlotDialogCard, nextChecked: boolean) {
    if (!card.user_id) {
      return;
    }

    const targetUserId = card.user_id;
    const previousChecked = Boolean(card.is_checked);

    setMembersError(null);
    setSavingMemberChecks((current) => ({ ...current, [targetUserId]: true }));
    setMembers((current) =>
      current?.map((item) =>
        item.user_id === targetUserId ? { ...item, is_checked: nextChecked } : item
      ) ?? null
    );

    const result = await updateMemberCheck(targetUserId, nextChecked);

    if (result.error) {
      setMembers((current) =>
        current?.map((item) =>
          item.user_id === targetUserId ? { ...item, is_checked: previousChecked } : item
        ) ?? null
      );
      setMembersError(result.error);
    } else if (result.data) {
      setMembers((current) =>
        current?.map((item) =>
          item.user_id === targetUserId ? { ...item, is_checked: result.data?.is_checked } : item
        ) ?? null
      );
    }

    setSavingMemberChecks((current) => {
      const next = { ...current };
      delete next[targetUserId];
      return next;
    });
  }

  const cellMap = new Map<string, SlotCell[]>();
  if (grid) {
    for (const cell of grid.cells) {
      const key = slotKey(cell.date, cell.time_slot, cell.room);
      const list = cellMap.get(key) ?? [];
      list.push(cell);
      cellMap.set(key, list);
    }
  }

  const timeSlots = [1, 2, 3, 4, 5];
  const selectedDateForActiveTimeSlot =
    selected && selected.timeSlot === activeTimeSlot ? selected.date : null;
  const countdownItems = [
    { label: t("dashboard.countdownDay"), value: countdown.days },
    { label: t("dashboard.countdownHour"), value: countdown.hours },
    { label: t("dashboard.countdownMin"), value: countdown.minutes },
    { label: t("dashboard.countdownSec"), value: countdown.seconds }
  ];

  function toggleTimeSlotHighlight(timeSlot: number) {
    setActiveTimeSlot((current) => (current === timeSlot ? null : timeSlot));
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.10),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.96))] px-4 py-4 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="grid gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-2.5">
            <StatusPill label={t("dashboard.pill")} />
            <div className="space-y-2.5">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                {t("dashboard.title")}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {t("dashboard.introLine1")}
                <br />
                {t("dashboard.introLine2")}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
                <span className="rounded-full border border-border/60 bg-white/80 px-2.5 py-1">
                  {t("dashboard.legendRow")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-sky-200 bg-sky-200" />
                  {t("dashboard.legendMale")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-rose-200 bg-rose-200" />
                  {t("dashboard.legendFemale")}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                  <span className="h-3 w-3 rounded-full border border-stone-200 bg-stone-100" />
                  {t("dashboard.legendEmpty")}
                </span>
              </div>
              {!canViewSlotMembers && (
                <div className="pt-1">
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700 sm:text-xs">
                    {t("dashboard.accessNote")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full self-start space-y-1.5 lg:w-[272px] lg:justify-self-end">
            <div className="rounded-2xl border border-sky-200/80 bg-[linear-gradient(160deg,rgba(240,249,255,0.98),rgba(255,255,255,0.95))] px-4 py-2.5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700/80">
                    {t("dashboard.countdownTitle")}
                  </div>
                  <p className="mt-1 text-[11px] text-sky-900/75">{t("dashboard.countdownDate")}</p>
                </div>
                <StatusPill label={t("dashboard.countdownBadge")} tone="success" />
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2">
                {countdownItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-sky-100/90 bg-white/88 px-2 py-2 text-center"
                  >
                    <div className="text-base font-semibold tracking-[-0.04em] text-sky-950 sm:text-lg">
                      {String(item.value).padStart(2, "0")}
                    </div>
                    <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700/70">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {grid && (
              <div className="rounded-2xl border border-border/60 bg-white/84 px-4 py-2.5 text-center shadow-sm backdrop-blur">
                <div className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                  {grid.approved_member_count}
                  <span className="text-sm font-normal text-muted-foreground">
                    {t("dashboard.approvedSuffix", { count: COMMUNITY_TARGET_MEMBERS })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </ShellCard>

      {loadingGrid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>
        </ShellCard>
      ) : !grid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">{t("dashboard.loadFailed")}</p>
        </ShellCard>
      ) : (
        <ShellCard className="overflow-hidden p-3 sm:p-4 lg:p-5">
          <div className="space-y-3 sm:hidden">
            {MOBILE_DATE_GROUPS.map((dateGroup, groupIndex) => (
              <div
                key={`mobile-group-${groupIndex}`}
                className="grid grid-cols-[34px_repeat(2,minmax(0,1fr))] gap-2"
              >
                <div />
                {dateGroup.map((date) => (
                  <div
                    key={date}
                    className={`rounded-2xl border px-2 py-2 text-center ${dateHeaderClass(date)}`}
                  >
                    <div className="text-[11px] font-semibold text-foreground">
                      {getDateLabel(date, language)}
                    </div>
                  </div>
                ))}

                {timeSlots.map((timeSlot) => {
                  const isActiveTimeSlot = activeTimeSlot === timeSlot;

                  return (
                    <Fragment key={`mobile-row-${groupIndex}-${timeSlot}`}>
                      <button
                        type="button"
                        onClick={() => toggleTimeSlotHighlight(timeSlot)}
                        aria-pressed={isActiveTimeSlot}
                        title={formatInterviewTimeSlot(timeSlot)}
                        className={`flex min-h-[158px] items-center justify-center rounded-2xl border text-center text-[11px] font-semibold transition ${timeSlotLabelClass(
                          isActiveTimeSlot,
                          selectedDateForActiveTimeSlot
                        )}`}
                      >
                        {timeSlot}T
                      </button>

                      {dateGroup.map((date) => (
                        <div
                          key={slotKey(date, timeSlot, 0)}
                          className={`rounded-2xl border p-1.5 ${timeSlotBoardClass(date, isActiveTimeSlot)}`}
                        >
                          <div className="space-y-1">
                            {ROOMS.map((room) => {
                              const cells = cellMap.get(slotKey(date, timeSlot, room)) ?? [];
                              const isSelected =
                                selected?.date === date &&
                                selected.timeSlot === timeSlot &&
                                selected.room === room;

                              return (
                                <DepartmentRowButton
                                  key={slotKey(date, timeSlot, room)}
                                  date={date}
                                  dateLabel={getDateLabel(date, language)}
                                  timeSlot={timeSlot}
                                  room={room}
                                  roomLabel={t("dashboard.roomLabel", { room })}
                                  cells={cells}
                                  isSelected={isSelected}
                                  onSelect={handleSlotClick}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="hidden sm:grid sm:grid-cols-[38px_repeat(4,minmax(0,1fr))] sm:gap-2">
            <div />
            {INTERVIEW_DATES.map((date) => (
              <div
                key={date}
                className={`rounded-2xl border px-2 py-2 text-center ${dateHeaderClass(date)}`}
              >
                <div className="hidden text-sm font-semibold text-foreground sm:block">
                  {getDateLabel(date, language)}
                </div>
              </div>
            ))}

            {timeSlots.map((timeSlot) => {
              const isActiveTimeSlot = activeTimeSlot === timeSlot;

              return (
                <div key={`row-${timeSlot}`} className="contents">
                  <button
                    type="button"
                    onClick={() => toggleTimeSlotHighlight(timeSlot)}
                    aria-pressed={isActiveTimeSlot}
                    title={formatInterviewTimeSlot(timeSlot)}
                    className={`flex min-h-[126px] items-center justify-center rounded-2xl border px-1 text-center text-[11px] font-semibold transition ${timeSlotLabelClass(
                      isActiveTimeSlot,
                      selectedDateForActiveTimeSlot
                    )}`}
                  >
                    <span>{timeSlot}T</span>
                  </button>

                  {INTERVIEW_DATES.map((date) => (
                    <div
                      key={slotKey(date, timeSlot, 0)}
                      className={`rounded-2xl border p-1.5 sm:p-2 ${timeSlotBoardClass(date, isActiveTimeSlot)}`}
                    >
                      <div className="space-y-1">
                        {ROOMS.map((room) => {
                          const cells = cellMap.get(slotKey(date, timeSlot, room)) ?? [];
                          const isSelected =
                            selected?.date === date &&
                            selected.timeSlot === timeSlot &&
                            selected.room === room;

                          return (
                            <DepartmentRowButton
                              key={slotKey(date, timeSlot, room)}
                              date={date}
                              dateLabel={getDateLabel(date, language)}
                              timeSlot={timeSlot}
                              room={room}
                              roomLabel={t("dashboard.roomLabel", { room })}
                              cells={cells}
                              isSelected={isSelected}
                              onSelect={handleSlotClick}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </ShellCard>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label={t("dashboard.dialogCloseAria")}
            onClick={closeSlotDialog}
            className="absolute inset-0 bg-slate-950/36 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-dialog-title"
            className="relative z-10 w-full max-w-5xl"
          >
            <ShellCard className="max-h-[calc(100vh-2rem)] overflow-y-auto border-white/70 bg-white/97 p-4 shadow-2xl sm:p-5 lg:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 id="slot-dialog-title" className="text-sm font-semibold sm:text-base">
                    {getDateLabel(selected.date, language)} ·{" "}
                    {formatInterviewTimeSlot(selected.timeSlot)} ·{" "}
                    {t("dashboard.roomLabel", { room: selected.room })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeSlotDialog}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                >
                  {t("dashboard.dialogClose")}
                </button>
              </div>

              {loadingMembers && <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>}

              {membersError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-700">{membersError}</p>
                  {sessionUser &&
                    !sessionUser.is_admin &&
                    sessionUser.applicant_status !== "approved" && (
                      <Button className="mt-3" size="sm" onClick={() => navigate("/verification")}>
                        {t("dashboard.applyVerification")}
                      </Button>
                    )}
                </div>
              )}

              {members && (
                <div className="mx-auto grid max-w-[900px] auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((card) => (
                    <MemberCardItem
                      key={card.seat}
                      card={card}
                      isSavingCheck={card.user_id ? Boolean(savingMemberChecks[card.user_id]) : false}
                      onTogglePersistedCheck={
                        canViewSlotMembers && card.previewState !== "demo"
                          ? handlePersistedCheckToggle
                          : undefined
                      }
                    />
                  ))}
                  <SomaLogoCard />
                </div>
              )}
            </ShellCard>
          </div>
        </div>
      )}
    </div>
  );
}
