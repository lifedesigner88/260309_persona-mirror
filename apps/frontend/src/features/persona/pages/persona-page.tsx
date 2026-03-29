import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLoaderData, useRouteLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea
} from "@/common/components";
import type { RootLoaderData } from "@/features/auth";
import { cn } from "@/lib/utils";

import {
  readPersonaAskResponse,
  readPersonaChatHistoryResponse,
  readPersonaChatResetResponse,
  requestPersonaAsk,
  requestPersonaChatHistory,
  requestPersonaChatReset
} from "../utils/api";
import type {
  MbtiProfile,
  PersonaChatQuota,
  PersonaProfile,
  PersonaQAMessage,
  TechStackItem
} from "../utils/types";

// ─── Markdown export ─────────────────────────────────────────────────────────

function buildProfileMarkdown(p: import("../utils/types").PersonaProfile): string {
  const lines: string[] = [];

  lines.push(`# ${p.archetype}`);
  lines.push(`> ${p.headline}`);
  lines.push("");
  lines.push(p.one_liner);
  lines.push("");

  if (p.identity_keywords && p.identity_keywords.length > 0) {
    lines.push(`**Identity keywords:** ${p.identity_keywords.join(" · ")}`);
    lines.push("");
  }

  lines.push(`## Top Values`);
  p.top3_values.forEach((v) => lines.push(`- ${v}`));
  lines.push("");

  if (p.creator_pr) {
    lines.push(`## Team-Building PR`);
    lines.push(p.creator_pr.event_note);
    lines.push("");
    lines.push(`**Strongest role:** ${p.creator_pr.role_summary}`);
    lines.push("");

    if (p.creator_pr.quick_facts.length > 0) {
      lines.push(`**At a glance:**`);
      p.creator_pr.quick_facts.forEach((fact) => lines.push(`- ${fact.label}: ${fact.value}`));
      lines.push("");
    }

    [{ label: "Project", section: p.creator_pr.project }].forEach(({ label, section }) => {
      lines.push(`### ${label} — ${section.title}`);
      lines.push(section.summary);
      lines.push("");
      section.bullets.forEach((bullet) => lines.push(`- ${bullet}`));
      lines.push("");
    });
  }

  if (p.mbti) {
    lines.push(`## MBTI`);
    lines.push(`**${p.mbti.type}-${p.mbti.identity}** (AI prediction)`);
    lines.push("");
    lines.push("| Dimension | Score |");
    lines.push("| --- | --- |");
    Object.entries(p.mbti.scores).forEach(([k, v]) =>
      lines.push(`| ${k.charAt(0).toUpperCase() + k.slice(1)} | ${v}% |`)
    );
    lines.push("");
  }

  lines.push(`## Goals & Vision`);
  lines.push(`**Long-term vision:** ${p.goals_vision.long_term_vision}`);
  lines.push("");
  lines.push(`**Lifetime mission:** ${p.goals_vision.lifetime_mission}`);
  lines.push("");
  lines.push(`**Current decade:** ${p.goals_vision.current_decade_mission}`);
  lines.push("");
  lines.push("**Directions:**");
  p.goals_vision.long_term_directions.forEach((d) => lines.push(`- ${d}`));
  lines.push("");

  if (p.team_up) {
    lines.push(`## Team-Up Snapshot`);
    lines.push(p.team_up.pitch);
    lines.push("");
    lines.push(`**Availability:** ${p.team_up.availability}`);
    lines.push("");
    lines.push("**Target domains:**");
    p.team_up.target_domains.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
    lines.push("**What I bring:**");
    p.team_up.what_i_bring.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("**Looking for:**");
    p.team_up.looking_for.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  }

  if (Object.keys(p.fit_vectors).length > 0) {
    lines.push(`## Drive Vectors (AI prediction)`);
    lines.push("| Vector | Score |");
    lines.push("| --- | --- |");
    Object.entries(p.fit_vectors).forEach(([k, v]) =>
      lines.push(`| ${k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} | ${v}/5 |`)
    );
    lines.push("");
  }

  if (p.sdg_alignment.length > 0) {
    lines.push(`## SDGs Alignment (AI prediction)`);
    p.sdg_alignment.forEach((s) => lines.push(`- SDG ${s.sdg} — ${s.label} (${s.resonance})`));
    lines.push("");
  }

  lines.push(`## Strengths`);
  p.strengths.forEach((s) => lines.push(`- ${s}`));
  lines.push("");

  lines.push(`## Weaknesses`);
  p.watchouts.forEach((w) => lines.push(`- ${w}`));
  lines.push("");

  if (p.identity_shifts.length > 0) {
    lines.push(`## Identity Timeline`);
    p.identity_shifts.forEach((s) => {
      lines.push(`### ${s.period} — ${s.label}`);
      lines.push(s.note);
      lines.push("");
    });
  }

  return lines.join("\n");
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export type PersonaLoaderData = {
  personaId: string;
  title: string;
  dataEng: PersonaProfile;
  dataKor: PersonaProfile | null;
  notionUrl: string | null;
};

export type PersonaPageMode = "pr" | "chat";

const HUPOSITORY_URL = "https://github.com/lifedesigner88/lifedesigner88/tree/main/hupository";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const SDG_ALL_GOALS_URL = "https://sdgs.un.org/goals";
const SDG_WHEEL_COLORS = [
  "#E5243B",
  "#DDA63A",
  "#4C9F38",
  "#C5192D",
  "#FF3A21",
  "#26BDE2",
  "#FCC30B",
  "#A21942",
  "#FD6925",
  "#DD1367",
  "#FD9D24",
  "#BF8B2E",
  "#3F7E44",
  "#0A97D9",
  "#56C02B",
  "#00689D",
  "#19486A"
];

const SECTION_CARD_BASE =
  "overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm";
const SECTION_HEADER_BASE = "gap-3 px-5 pt-5 pb-0 sm:px-6 sm:pt-6";
const SECTION_CONTENT_BASE = "space-y-4 px-5 py-5 sm:px-6 sm:py-6";
const SECTION_EYEBROW_BASE = "text-[11px] font-semibold uppercase tracking-[0.14em]";
const SECTION_TITLE_BASE =
  "text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.55rem]";
const SECTION_TEXT_BASE = "text-sm leading-7 text-slate-600";
const SECTION_SUBTEXT_BASE = "text-xs leading-5 text-slate-500";
const PANEL_BASE =
  "rounded-2xl border border-white/80 bg-white/78 px-4 py-4 shadow-sm backdrop-blur-sm";
const PANEL_LABEL_BASE = "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]";
const NOTE_BASE =
  "flex items-start gap-2 rounded-2xl border border-white/80 bg-white/74 px-4 py-3 shadow-sm";

function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(SECTION_EYEBROW_BASE, className)}>{children}</div>;
}

function SectionPanel({
  children,
  className,
  label,
  labelClassName
}: {
  children: ReactNode;
  className?: string;
  label?: ReactNode;
  labelClassName?: string;
}) {
  return (
    <div className={cn(PANEL_BASE, className)}>
      {label ? <div className={cn(PANEL_LABEL_BASE, labelClassName)}>{label}</div> : null}
      {children}
    </div>
  );
}

function SectionNote({
  children,
  className,
  iconClassName,
  textClassName
}: {
  children: ReactNode;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn(NOTE_BASE, className)}>
      <span className={cn("mt-0.5", iconClassName)}>✦</span>
      <div className={cn(SECTION_SUBTEXT_BASE, textClassName)}>{children}</div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Returns a vivid HSL color evenly spaced around the hue wheel.
// Works for any axis count — 5, 7, 9, etc.
function axisColor(i: number, total: number): string {
  const hue = Math.round((i / total) * 360);
  return `hsl(${hue}, 58%, 62%)`;
}

function RadarChart({ vectors }: { vectors: Record<string, number> }) {
  const { t } = useTranslation("persona");
  const entries = Object.entries(vectors) as [string, number][];
  const n = entries.length;
  const cx = 230,
    cy = 210,
    r = 120,
    max = 5;
  const VW = 520,
    VH = 420;

  function point(level: number, i: number) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return {
      x: cx + (level / max) * r * Math.cos(angle),
      y: cy + (level / max) * r * Math.sin(angle)
    };
  }

  function toPolyPoints(level: number) {
    return entries
      .map((_, i) => {
        const p = point(level, i);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  const dataPoints = entries
    .map(([, val], i) => {
      const p = point(val, i);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full mx-auto">
      <defs>
        <radialGradient id="radarFill" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          {entries.map((_, i) => (
            <stop
              key={i}
              offset={`${Math.round(((i + 1) / n) * 100)}%`}
              stopColor={axisColor(i, n)}
              stopOpacity="0.22"
            />
          ))}
        </radialGradient>
      </defs>
      {/* Grid rings */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon
          key={lvl}
          points={toPolyPoints(lvl)}
          fill="none"
          stroke="rgba(0,0,0,0.07)"
          strokeWidth="1"
        />
      ))}
      {/* Colored axis spokes */}
      {entries.map((_, i) => {
        const p = point(max, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={axisColor(i, n)}
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />
        );
      })}
      {/* Gradient-filled polygon */}
      <polygon points={dataPoints} fill="url(#radarFill)" stroke="none" />
      {/* Colored edge segments between each adjacent data point */}
      {entries.map(([, val], i) => {
        const a = point(val, i);
        const b = point(entries[(i + 1) % n][1], (i + 1) % n);
        const color = axisColor(i, n);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        );
      })}
      {/* Colored data point dots */}
      {entries.map(([, val], i) => {
        const p = point(val, i);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={axisColor(i, n)}
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}
      {/* Labels — colored to match axis */}
      {entries.map(([key, val], i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const lr = r + 44;
        const lx = cx + lr * Math.cos(angle);
        const ly = cy + lr * Math.sin(angle);
        const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
        const raw = t(`vectorLabels.${key}`, {
          returnObjects: true,
          defaultValue: [key.replace(/_/g, " ")]
        }) as unknown;
        const [line1, line2] = Array.isArray(raw) ? (raw as [string, string?]) : [String(raw)];
        const color = axisColor(i, n);
        const scoreY = ly + (line2 ? 22 : 10);
        return (
          <g key={key}>
            <text textAnchor={anchor} fontSize="11" fill={color} fontWeight="700">
              <tspan x={lx} dy={`${ly - (line2 ? 8 : 2)}`}>
                {line1}
              </tspan>
              {line2 && (
                <tspan x={lx} dy="13">
                  {line2}
                </tspan>
              )}
            </text>
            <text x={lx} y={scoreY} textAnchor={anchor} fontSize="11" fill={color} fontWeight="800">
              {val}/{max}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 5-stop gradients: left-pole color → … → right-pole color
// Colors are chosen per axis so each bar reads as its own spectrum.
const MBTI_ROWS = [
  {
    key: "introverted" as const,
    left: "I",
    leftKey: "introverted",
    leftUrl: "https://www.16personalities.com/articles/mind-introverted-vs-extraverted",
    right: "E",
    rightKey: "extraverted",
    rightUrl: "https://www.16personalities.com/articles/mind-introverted-vs-extraverted",
    gradient: "linear-gradient(to right, #3730a3, #7c3aed, #e9d5ff, #fcd34d, #d97706)",
    leftColor: "#3730a3",
    rightColor: "#d97706"
  },
  {
    key: "intuitive" as const,
    left: "N",
    leftKey: "intuitive",
    leftUrl: "https://www.16personalities.com/articles/energy-intuitive-vs-observant",
    right: "S",
    rightKey: "observant",
    rightUrl: "https://www.16personalities.com/articles/energy-intuitive-vs-observant",
    gradient: "linear-gradient(to right, #0e7490, #22d3ee, #a5f3fc, #6ee7b7, #059669)",
    leftColor: "#0e7490",
    rightColor: "#059669"
  },
  {
    key: "feeling" as const,
    left: "F",
    leftKey: "feeling",
    leftUrl: "https://www.16personalities.com/articles/nature-thinking-vs-feeling",
    right: "T",
    rightKey: "thinking",
    rightUrl: "https://www.16personalities.com/articles/nature-thinking-vs-feeling",
    gradient: "linear-gradient(to right, #be185d, #f472b6, #fbcfe8, #bae6fd, #0369a1)",
    leftColor: "#be185d",
    rightColor: "#0369a1"
  },
  {
    key: "judging" as const,
    left: "J",
    leftKey: "judging",
    leftUrl: "https://www.16personalities.com/articles/tactics-judging-vs-prospecting",
    right: "P",
    rightKey: "prospecting",
    rightUrl: "https://www.16personalities.com/articles/tactics-judging-vs-prospecting",
    gradient: "linear-gradient(to right, #b45309, #fbbf24, #fef9c3, #bbf7d0, #15803d)",
    leftColor: "#b45309",
    rightColor: "#15803d"
  },
  {
    key: "turbulent" as const,
    left: "T",
    leftKey: "turbulent",
    leftUrl: "https://www.16personalities.com/articles/identity-assertive-vs-turbulent",
    right: "A",
    rightKey: "assertive",
    rightUrl: "https://www.16personalities.com/articles/identity-assertive-vs-turbulent",
    gradient: "linear-gradient(to right, #b91c1c, #f87171, #fecdd3, #ddd6fe, #6d28d9)",
    leftColor: "#b91c1c",
    rightColor: "#6d28d9"
  }
] as const;

// Returns the 5 dominant trait colors in axis order
function getMbtiDominantColors(mbti: MbtiProfile): string[] {
  return MBTI_ROWS.map(({ key, leftColor, rightColor }) =>
    mbti.scores[key] >= 50 ? leftColor : rightColor
  );
}

// Returns a smooth linear gradient from the 5 dominant trait colors
function getMbtiDominantGradient(mbti: MbtiProfile): string {
  return `linear-gradient(135deg, ${getMbtiDominantColors(mbti).join(", ")})`;
}

function MbtiBarChart({ mbti }: { mbti: MbtiProfile }) {
  const { t } = useTranslation("persona");
  return (
    <div className="space-y-4 py-1">
      {MBTI_ROWS.map(
        ({
          key,
          left,
          leftKey,
          leftUrl,
          right,
          rightKey,
          rightUrl,
          gradient,
          leftColor,
          rightColor
        }) => {
          const leftLabel = t(`mbtiDimensions.${leftKey}`);
          const rightLabel = t(`mbtiDimensions.${rightKey}`);
          const score = mbti.scores[key]; // 0–100 toward left pole
          const dominant = score >= 50;
          const thumbColor = dominant ? leftColor : rightColor;
          return (
            <div key={key} className="flex items-center gap-3">
              {/* Left pole */}
              <div className="w-8 sm:w-28 flex items-center justify-end gap-1.5 shrink-0">
                <div className="hidden sm:flex flex-col items-end">
                  <a
                    href={leftUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium hover:underline underline-offset-2"
                    style={{ color: leftColor }}
                  >
                    {leftLabel}
                  </a>
                  <span className="text-xs font-bold tabular-nums" style={{ color: leftColor }}>
                    {score}%
                  </span>
                </div>
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-opacity"
                  style={{ background: leftColor, opacity: dominant ? 1 : 0.25 }}
                >
                  {left}
                </span>
              </div>

              {/* Gradient bar */}
              <div
                className="relative flex-1 h-3.5 rounded-full shadow-inner"
                style={{ background: gradient }}
              >
                {/* center tick */}
                <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/50 -translate-x-px rounded-full" />
                {/* thumb */}
                <div
                  className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-md transition-all duration-500"
                  style={{
                    left: `${score}%`,
                    boxShadow: `0 0 0 2px ${thumbColor}, 0 2px 6px rgba(0,0,0,0.18)`
                  }}
                />
              </div>

              {/* Right pole */}
              <div className="w-8 sm:w-28 flex items-center gap-1.5 shrink-0">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-opacity"
                  style={{ background: rightColor, opacity: !dominant ? 1 : 0.25 }}
                >
                  {right}
                </span>
                <div className="hidden sm:flex flex-col">
                  <a
                    href={rightUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium hover:underline underline-offset-2"
                    style={{ color: rightColor }}
                  >
                    {rightLabel}
                  </a>
                  <span className="text-xs font-bold tabular-nums" style={{ color: rightColor }}>
                    {100 - score}%
                  </span>
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}

function SdgBadge({ sdg, label, resonance }: { sdg: number; label: string; resonance: string }) {
  const nn = String(sdg).padStart(2, "0");
  const iconUrl = `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${nn}.jpg`;
  const goalUrl = `https://sdgs.un.org/goals/goal${sdg}`;
  const emphasisClass =
    resonance === "high"
      ? "border-sky-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] shadow-[0_16px_32px_rgba(56,189,248,0.12)]"
      : "border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] shadow-[0_12px_26px_rgba(15,23,42,0.06)]";
  return (
    <a
      href={goalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex h-full items-center gap-4 rounded-[24px] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white",
        emphasisClass
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-white/80 bg-white shadow-sm">
        <img
          src={iconUrl}
          alt={`SDG ${sdg}`}
          width={76}
          height={76}
          className="h-[76px] w-[76px] object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="inline-flex rounded-full border border-slate-200 bg-white/82 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-slate-500">
          SDG {sdg}
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{label}</p>
      </div>
    </a>
  );
}

function SdgOverviewLink() {
  const { t } = useTranslation("persona");
  const fallbackGradient = `conic-gradient(${SDG_WHEEL_COLORS.map((color, index) => {
    const start = (index / SDG_WHEEL_COLORS.length) * 360;
    const end = ((index + 1) / SDG_WHEEL_COLORS.length) * 360;
    return `${color} ${start}deg ${end}deg`;
  }).join(", ")})`;

  return (
    <a
      href={SDG_ALL_GOALS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("sdg.allGoalsLinkLabel")}
      title={t("sdg.allGoalsLinkLabel")}
      className="group inline-flex items-center gap-3 self-start rounded-[20px] border border-slate-200/90 bg-white/88 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition group-hover:scale-[1.03]">
        <span className="absolute inset-0 rounded-full" style={{ background: fallbackGradient }} />
        <span className="absolute inset-[24%] rounded-full bg-white shadow-inner" />
        <span className="relative text-[10px] font-bold tracking-[0.16em] text-slate-700">17</span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">
          {t("sdg.allGoalsLinkTitle")}
        </span>
        <span className="block text-xs leading-5 text-slate-500">
          {t("sdg.allGoalsLinkCaption")}
        </span>
      </span>
      <span className="sr-only">{t("sdg.allGoalsLinkLabel")}</span>
    </a>
  );
}

function HupositoryButton({ className }: { className?: string }) {
  const { t } = useTranslation("persona");

  return (
    <a
      href={HUPOSITORY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/88 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700",
        className
      )}
    >
      <span aria-hidden="true">✅</span>
      {t("creatorIntro.repoButton")}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
      >
        <path d="M7 17 17 7" />
        <path d="M9 7h8v8" />
      </svg>
    </a>
  );
}

// ─── Tech Stack card ─────────────────────────────────────────────────────────

function TechStackCard({ items }: { items: TechStackItem[] }) {
  const { t } = useTranslation("persona");
  const categoryOrder = new Map([
    ["언어", 0],
    ["Language", 0],
    ["프론트엔드", 1],
    ["Frontend", 1],
    ["풀스택", 2],
    ["Full-stack", 2],
    ["백엔드", 3],
    ["Backend", 3],
    ["AI", 4],
    ["서비스", 5],
    ["Service", 5],
    ["데이터베이스", 6],
    ["Database", 6],
    ["인프라", 7],
    ["Infra", 7]
  ]);
  const sortedItems = [...items].sort((a, b) => {
    const categoryDiff =
      (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <Card
      className={cn(
        SECTION_CARD_BASE,
        "border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(242,246,250,0.95))]"
      )}
    >
      <CardHeader className={SECTION_HEADER_BASE}>
        <SectionEyebrow className="text-slate-500">{t("techStack.title")}</SectionEyebrow>
      </CardHeader>
      <CardContent className={cn(SECTION_CONTENT_BASE, "pt-4")}>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))" }}
        >
          {sortedItems.map((item) => (
            <div
              key={item.name}
              className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/88 px-3.5 py-3 text-center shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              title={`${item.name} · ${item.category}`}
            >
              <img
                src={item.icon_url}
                alt={item.name}
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xs font-medium leading-5 text-slate-700 capitalize">
                {item.name}
              </span>
              <span className="text-[10px] text-slate-400">{item.category}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamUpCard({ profile }: { profile: PersonaProfile }) {
  const { t } = useTranslation("persona");
  if (!profile.team_up) return null;

  return (
    <Card
      className={cn(
        SECTION_CARD_BASE,
        "border-slate-200 bg-[linear-gradient(145deg,rgba(244,249,252,0.98),rgba(248,250,252,0.96))]"
      )}
    >
      <CardHeader className={SECTION_HEADER_BASE}>
        <SectionEyebrow className="text-sky-700/80">{t("teamUp.sectionLabel")}</SectionEyebrow>
        <CardTitle className={cn(SECTION_TITLE_BASE, "max-w-4xl text-slate-950")}>
          {profile.team_up.pitch}
        </CardTitle>
      </CardHeader>
      <CardContent className={SECTION_CONTENT_BASE}>
        <SectionPanel label={t("teamUp.availability")} labelClassName="text-sky-700/80">
          <p className={SECTION_TEXT_BASE}>{profile.team_up.availability}</p>
        </SectionPanel>
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionPanel label={t("teamUp.targetDomains")} labelClassName="text-sky-700/80">
            <ul className="space-y-1.5">
              {profile.team_up.target_domains.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionPanel>
          <SectionPanel label={t("teamUp.whatIBring")} labelClassName="text-emerald-700/80">
            <ul className="space-y-1.5">
              {profile.team_up.what_i_bring.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionPanel>
          <SectionPanel label={t("teamUp.lookingFor")} labelClassName="text-violet-700/80">
            <ul className="space-y-1.5">
              {profile.team_up.looking_for.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionPanel>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Q&A panel (auth-gated) ───────────────────────────────────────────────────

function PersonaChatHowItWorksButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("persona");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label={t("qa.howItWorksClose")}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/36 backdrop-blur-[2px]"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="persona-chat-how-title"
              className="relative z-10 w-full max-w-3xl"
            >
              <button
                type="button"
                aria-label={t("qa.howItWorksClose")}
                onClick={() => setOpen(false)}
                className="absolute top-2 right-2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/96 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-slate-900 sm:top-3 sm:right-3"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  ×
                </span>
              </button>
              <Card className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[30px] border-white/80 bg-white/97 shadow-2xl">
                <CardHeader className="gap-3 px-5 pt-5 pb-0 pr-16 sm:px-6 sm:pt-6 sm:pr-20">
                  <div className="space-y-2">
                    <SectionEyebrow className="text-sky-600">
                      {t("qa.howItWorksBadge")}
                    </SectionEyebrow>
                    <CardTitle
                      id="persona-chat-how-title"
                      className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.45rem]"
                    >
                      {t("qa.howItWorksTitle")}
                    </CardTitle>
                    <p className={SECTION_TEXT_BASE}>{t("qa.howItWorksDescription")}</p>
                  </div>
                </CardHeader>
                <CardContent className={SECTION_CONTENT_BASE}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SectionPanel
                      label={t("qa.howItWorksAccessLabel")}
                      labelClassName="text-emerald-600"
                      className="border-emerald-200/80 bg-emerald-50/70"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("qa.howItWorksAccessBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("qa.howItWorksContextLabel")}
                      labelClassName="text-sky-600"
                      className="border-sky-200/80 bg-sky-50/80"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("qa.howItWorksContextBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("qa.howItWorksMemoryLabel")}
                      labelClassName="text-violet-600"
                      className="border-violet-200/80 bg-violet-50/70"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("qa.howItWorksMemoryBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("qa.howItWorksLoggingLabel")}
                      labelClassName="text-amber-600"
                      className="border-amber-200/80 bg-amber-50/80"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("qa.howItWorksLoggingBody")}</p>
                    </SectionPanel>
                  </div>

                  <p className="px-1 text-[11px] leading-5 text-slate-400 sm:text-right">
                    <span className="font-semibold text-slate-500">
                      {t("qa.howItWorksModelLabel")}
                    </span>
                    {` · ${t("qa.howItWorksModelBody")}`}
                  </p>

                  <SectionNote
                    className="border-rose-200/90 bg-rose-50/90"
                    iconClassName="text-rose-500"
                  >
                    {t("qa.loggingNotice")}
                  </SectionNote>
                </CardContent>
              </Card>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "border-sky-300 bg-sky-50/95 text-sky-700 hover:border-sky-400 hover:bg-sky-100 hover:text-sky-800",
          compact ? "self-start" : ""
        )}
      >
        {t("qa.howItWorksButton")}
      </Button>
      {dialog}
    </>
  );
}

function PersonaLoginActions({ showHowItWorks = false }: { showHowItWorks?: boolean }) {
  const { t } = useTranslation("persona");

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
      {showHowItWorks ? <PersonaChatHowItWorksButton compact /> : null}
      <a href="/auth/login" className="w-full sm:w-auto">
        <Button size="sm" className="w-full sm:w-auto">
          {t("loginPrompt.loginBtn")}
        </Button>
      </a>
    </div>
  );
}

function renderChatMessageContent(content: string): ReactNode {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 overflow-visible">
      {lines.map((line, lineIndex) => {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          return <div key={`line-${lineIndex}`} className="h-1.5" />;
        }

        const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const title = headingMatch[2];
          const headingEmoji = level === 1 ? "✨" : level === 2 ? "🔹" : "▫️";
          const headingClassName =
            level === 1
              ? "text-[0.95rem] font-semibold tracking-[-0.015em]"
              : level === 2
                ? "text-[0.84rem] font-semibold tracking-[-0.01em] opacity-90"
                : "text-[0.78rem] font-medium tracking-[-0.01em] opacity-85";

          return (
            <div
              key={`line-${lineIndex}`}
              className={cn("flex items-center gap-1.5 pt-1 pb-0.5", lineIndex > 0 ? "mt-2" : "")}
            >
              <span aria-hidden="true" className="shrink-0 opacity-80">
                {headingEmoji}
              </span>
              <span className={headingClassName}>{title}</span>
            </div>
          );
        }

        const parts: ReactNode[] = [];
        const boldPattern = /\*\*(.+?)\*\*/g;
        let cursor = 0;
        let match: RegExpExecArray | null;

        while ((match = boldPattern.exec(line)) !== null) {
          if (match.index > cursor) {
            parts.push(line.slice(cursor, match.index));
          }
          parts.push(
            <strong key={`bold-${lineIndex}-${match.index}`} className="font-semibold">
              {match[1]}
            </strong>
          );
          cursor = match.index + match[0].length;
        }

        if (cursor < line.length) {
          parts.push(line.slice(cursor));
        }

        if (parts.length === 0) {
          parts.push("");
        }

        return (
          <p key={`line-${lineIndex}`} className="break-words text-sm leading-6">
            {parts}
          </p>
        );
      })}
    </div>
  );
}

function PersonaQAPanel({
  personId,
  lang,
  compact = false,
  showRepoAction = false
}: {
  personId: string;
  lang: string;
  compact?: boolean;
  showRepoAction?: boolean;
}) {
  const { t } = useTranslation("persona");
  const [messages, setMessages] = useState<PersonaQAMessage[]>([]);
  const [quota, setQuota] = useState<PersonaChatQuota | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [resettingSession, setResettingSession] = useState(false);
  const [sessionResetNoticeVisible, setSessionResetNoticeVisible] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelDescription = compact ? t("qa.compactDescription") : t("qa.description");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");
      setSessionResetNoticeVisible(false);
      setMessages([]);
      try {
        const response = await requestPersonaChatHistory(personId, lang);
        if (!response.ok) {
          throw new Error("history-load-failed");
        }
        const data = await readPersonaChatHistoryResponse(response);
        if (!cancelled) {
          setMessages(data.messages);
          setQuota(data.quota);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
          setQuota(null);
          setHistoryError(t("qa.historyLoadFailed"));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [lang, personId, t]);

  async function handleSessionReset() {
    if (resettingSession) return;
    setResettingSession(true);
    setHistoryError("");
    try {
      const response = await requestPersonaChatReset(personId, lang);
      if (!response.ok) {
        throw new Error("reset-session-failed");
      }
      const data = await readPersonaChatResetResponse(response);
      setMessages([]);
      setQuota(data.quota);
      setInput("");
      setSessionResetNoticeVisible(true);
    } catch {
      setHistoryError(t("qa.resetSessionFailed"));
    } finally {
      setResettingSession(false);
      inputRef.current?.focus();
    }
  }

  async function handleAsk() {
    const question = input.trim();
    if (!question || loading) return;
    setSessionResetNoticeVisible(false);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question, lang }]);
    setLoading(true);
    try {
      const response = await requestPersonaAsk(personId, question, lang);
      if (response.ok) {
        const data = await readPersonaAskResponse(response);
        setQuota(data.quota);
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer, lang }]);
      } else if (response.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("qa.rateLimitError"), lang }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("qa.errorMessage"), lang }
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("qa.errorMessage"), lang }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function buildQuotaLabel() {
    if (!quota) {
      return "";
    }

    if (!quota.reset_at) {
      return t("qa.quotaStatus", { count: quota.remaining_questions });
    }

    const resetTime = new Intl.DateTimeFormat(lang.startsWith("ko") ? "ko-KR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(quota.reset_at));

    return t("qa.quotaStatusWithReset", {
      count: quota.remaining_questions,
      time: resetTime
    });
  }

  const quotaLabel = buildQuotaLabel();

  return (
    <Card className={cn(SECTION_CARD_BASE, "overflow-visible bg-white/94")}>
      <CardHeader className={SECTION_HEADER_BASE}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <SectionEyebrow className="text-slate-500">
              {compact ? t("qa.compactBadge") : t("qa.badge")}
            </SectionEyebrow>
            <CardTitle
              className={
                compact
                  ? "text-lg font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.35rem]"
                  : SECTION_TITLE_BASE
              }
            >
              {compact ? t("qa.compactTitle") : t("qa.title")}
            </CardTitle>
            {panelDescription ? <p className={SECTION_TEXT_BASE}>{panelDescription}</p> : null}
          </div>
          {showRepoAction || compact ? (
            <div className="flex flex-wrap items-center gap-2">
              {showRepoAction ? <HupositoryButton /> : null}
              {showRepoAction || compact ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSessionReset}
                  disabled={historyLoading || resettingSession || messages.length === 0}
                  className="border-emerald-300 bg-emerald-50/90 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 hover:text-emerald-800"
                >
                  {t("qa.resetSessionButton")}
                </Button>
              ) : null}
              {showRepoAction || compact ? <PersonaChatHowItWorksButton compact /> : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={SECTION_CONTENT_BASE}>
        {historyLoading ? <p className={SECTION_SUBTEXT_BASE}>{t("qa.historyLoading")}</p> : null}
        {historyError ? <p className="text-xs leading-5 text-rose-600">{historyError}</p> : null}

        {sessionResetNoticeVisible && !historyLoading ? (
          <SectionNote
            className="border-emerald-200 bg-emerald-50/80"
            iconClassName="text-emerald-500"
          >
            {t("qa.sessionResetNotice")}
          </SectionNote>
        ) : null}

        {messages.length > 0 ? (
          <div className="space-y-3 overflow-visible rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm">
            {messages.map((msg, i) => (
              <div
                key={msg.message_id ?? `${msg.role}-${i}-${msg.content.slice(0, 24)}`}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`max-w-[80%] overflow-visible rounded-2xl px-4 py-3.5 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "border border-sky-200/80 bg-sky-50/90 text-slate-800"
                  }`}
                >
                  <div className="break-words overflow-visible">
                    {renderChatMessageContent(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex gap-3">
                <div className="animate-pulse rounded-2xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-slate-800">
                  {t("qa.thinking")}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Textarea
            autoGrow
            minRows={3}
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("qa.placeholder")}
            className="resize-none"
            disabled={loading}
          />
          <Button onClick={handleAsk} disabled={loading || !input.trim()} className="self-end">
            {t("qa.ask")}
          </Button>
        </div>
        <div className="flex flex-col gap-1.5 pt-1 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">{t("qa.disclaimer")}</p>
          {quotaLabel ? (
            <p className="text-right text-[11px] leading-5 text-slate-400">{quotaLabel}</p>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-rose-600">{t("qa.loggingNotice")}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PersonaPage({ pageMode = "pr" }: { pageMode?: PersonaPageMode }) {
  const { t, i18n } = useTranslation("persona");
  const { personaId, title, dataEng, dataKor, notionUrl } = useLoaderData() as PersonaLoaderData;
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const sessionUser = rootData?.sessionUser ?? null;

  const lang = i18n.resolvedLanguage?.startsWith("ko") ? "ko" : "en";
  const profile = lang === "ko" && dataKor ? dataKor : dataEng;
  const isCreatorProfile = personaId === "sejong";
  const showExtendedPersonaSections = !isCreatorProfile;
  const creatorPr = isCreatorProfile ? (profile.creator_pr ?? null) : null;
  const creatorPrPage = isCreatorProfile && pageMode === "pr";
  const creatorChatPage = isCreatorProfile && pageMode === "chat";
  const showFullProfile = !isCreatorProfile || creatorPrPage;
  const showChatSection = !isCreatorProfile || creatorChatPage;
  const compactChat = !isCreatorProfile ? false : !creatorChatPage;
  const qaDescription = t("qa.description");

  // Very-light tinted backgrounds derived from dominant MBTI colors
  const mbtiColors = profile.mbti ? getMbtiDominantColors(profile.mbti) : [];
  function mbtiCardBg(idxA: number, idxB: number, deg = 135): string {
    const a = mbtiColors[idxA % mbtiColors.length];
    const b = mbtiColors[idxB % mbtiColors.length];
    if (!a || !b) return "rgba(255,255,255,0.94)";
    return `linear-gradient(${deg}deg, ${a}0f, ${b}0a, rgba(255,255,255,0.94))`;
  }

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(buildProfileMarkdown(profile));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profile]);
  const [heroHealthStatus, setHeroHealthStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [heroHealthLatencyMs, setHeroHealthLatencyMs] = useState<number | null>(null);
  const handleHeroHealthCheck = useCallback(async () => {
    setHeroHealthStatus("loading");
    setHeroHealthLatencyMs(null);
    const startedAt = performance.now();

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        credentials: "include",
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Health check failed");

      setHeroHealthStatus("success");
      setHeroHealthLatencyMs(Math.round(performance.now() - startedAt));
    } catch {
      setHeroHealthStatus("error");
    }
  }, []);
  const heroHealthLabel =
    heroHealthStatus === "loading"
      ? t("hero.healthLoading")
      : heroHealthStatus === "success"
        ? t("hero.healthResult", { ms: heroHealthLatencyMs ?? 0 })
        : heroHealthStatus === "error"
          ? t("hero.healthError")
          : t("hero.healthButton");
  const heroHealthTone =
    heroHealthStatus === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : heroHealthStatus === "error"
        ? "border-rose-300 bg-rose-50 text-rose-700"
        : heroHealthStatus === "loading"
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-white/88 text-slate-600";

  const sdgSection =
    profile.sdg_alignment.length > 0 ? (
      <Card
        className={cn(
          SECTION_CARD_BASE,
          "border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(248,250,252,0.94),rgba(255,247,237,0.9))]"
        )}
      >
        <CardHeader className={SECTION_HEADER_BASE}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex-1 space-y-3">
              <SectionEyebrow className="text-slate-500">{t("sdg.sectionLabel")}</SectionEyebrow>
              <div className="max-w-4xl text-sm leading-7 text-slate-600">
                {t("sdg.description")}
              </div>
            </div>
            <SdgOverviewLink />
          </div>
        </CardHeader>
        <CardContent className={SECTION_CONTENT_BASE}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {profile.sdg_alignment.map((s) => (
              <SdgBadge key={s.sdg} {...s} />
            ))}
          </div>
          <SectionNote className="border-slate-200/90 bg-white/70" iconClassName="text-slate-400">
            {t("sdg.aiNote")}
          </SectionNote>
        </CardContent>
      </Card>
    ) : null;

  const timelineSection =
    profile.identity_shifts.length > 0
      ? (() => {
          const mbtiColors = profile.mbti ? getMbtiDominantColors(profile.mbti) : [];
          return (
            <Card
              className={cn(SECTION_CARD_BASE, "bg-white/94")}
              style={{ background: mbtiCardBg(0, 4, 160) }}
            >
              <CardHeader className={SECTION_HEADER_BASE}>
                <SectionEyebrow className="text-slate-500">
                  {t("timeline.sectionLabel")}
                </SectionEyebrow>
              </CardHeader>
              <CardContent className={SECTION_CONTENT_BASE}>
                <div className="space-y-0">
                  {[...profile.identity_shifts].reverse().map((shift, i) => {
                    const color = mbtiColors[i % mbtiColors.length] ?? "#14b8a6";
                    return (
                      <div key={shift.period} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm shrink-0"
                            style={{ background: color }}
                          />
                          {i < profile.identity_shifts.length - 1 && (
                            <div
                              className="w-0.5 flex-1 min-h-[2rem]"
                              style={{
                                background: `linear-gradient(to bottom, ${color}, ${mbtiColors[(i + 1) % mbtiColors.length] ?? color})`
                              }}
                            />
                          )}
                        </div>
                        <div className="pb-5">
                          <div className="text-xs font-bold tracking-wide" style={{ color }}>
                            {shift.period}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold text-foreground">
                            {shift.label}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-muted-foreground">
                            {shift.note}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()
      : null;

  const heroCard = showFullProfile ? (
    <Card
      className={cn(
        SECTION_CARD_BASE,
        "border-slate-200 bg-[linear-gradient(160deg,rgba(243,250,248,0.98),rgba(242,249,251,0.94))]"
      )}
    >
      <CardHeader className={cn(SECTION_HEADER_BASE, isCreatorProfile ? "pb-5 sm:pb-6" : "")}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t("hero.badge")}</Badge>
              <Badge variant="success">{creatorPr ? creatorPr.event_badge : personaId}</Badge>
              <span className={SECTION_SUBTEXT_BASE}>{title}</span>
            </div>
            {isCreatorProfile ? (
              <button
                type="button"
                onClick={handleHeroHealthCheck}
                disabled={heroHealthStatus === "loading"}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-default",
                  heroHealthTone
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    heroHealthStatus === "success"
                      ? "bg-emerald-500"
                      : heroHealthStatus === "error"
                        ? "bg-rose-500"
                        : heroHealthStatus === "loading"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                  )}
                />
                {heroHealthLabel}
              </button>
            ) : null}
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
              {profile.archetype}
            </CardTitle>
            <p className={cn(SECTION_TEXT_BASE, "max-w-3xl")}>{profile.one_liner}</p>
            {profile.identity_keywords && profile.identity_keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.identity_keywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="border-sky-200 bg-sky-50/90 text-sky-700"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>
      {!isCreatorProfile ? (
        <CardContent className={SECTION_CONTENT_BASE}>
          <button
            onClick={handleCopy}
            className="group w-full rounded-2xl border border-sky-200/80 bg-white/72 px-5 py-4 text-left shadow-sm transition hover:bg-sky-50/70 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  {copied ? t("hero.copiedHeading") : t("hero.copyHeading")}
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-600">
                  {copied ? t("hero.copiedSubtext") : t("hero.copySubtext")}
                </div>
              </div>
              <span className="shrink-0 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition group-hover:border-sky-300">
                {copied ? t("hero.copiedBtn") : t("hero.copyBtn")}
              </span>
            </div>
          </button>
        </CardContent>
      ) : null}
    </Card>
  ) : null;

  const creatorHeroSupportCards = creatorPrPage ? (
    <div className="grid gap-4 lg:grid-cols-2">
      {notionUrl ? (
        <a
          href={notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-h-[168px] items-center justify-center rounded-[24px] border border-slate-200/90 bg-white/92 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
        >
          <div className="flex items-center justify-center gap-4 text-center sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-950 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
              >
                <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-7 text-slate-950 sm:text-[1.2rem]">
                {t("hero.portfolioButton")}
              </p>
            </div>
          </div>
        </a>
      ) : null}

      <div className="flex min-h-[168px] flex-col rounded-[24px] border border-sky-200/80 bg-[linear-gradient(145deg,rgba(236,253,255,0.96),rgba(255,251,235,0.94))] p-5 shadow-[0_14px_34px_rgba(14,165,233,0.12)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-sky-200 bg-sky-100/90 text-sky-700">
            {t("creatorIntro.aiBadge")}
          </Badge>
        </div>
        <p className="mt-3 text-base font-semibold leading-6 text-slate-900">
          {t("creatorIntro.aiTitle")}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{t("creatorIntro.aiNote")}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <a
            href={HUPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/88 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700"
          >
            <span aria-hidden="true">✅</span>
            {t("creatorIntro.repoButton")}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M7 17 17 7" />
              <path d="M9 7h8v8" />
            </svg>
          </a>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            {t("creatorIntro.aiSignature")}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      {heroCard}
      {creatorHeroSupportCards}

      {/* Tech Stack */}
      {creatorPrPage && profile.tech_stack && profile.tech_stack.length > 0 ? (
        <TechStackCard items={profile.tech_stack} />
      ) : null}

      {/* SDG alignment */}
      {showFullProfile ? sdgSection : null}

      {/* MBTI */}
      {showFullProfile && profile.mbti ? (
        <Card
          className={cn(
            SECTION_CARD_BASE,
            "border-slate-200 bg-[linear-gradient(135deg,rgba(247,245,252,0.98),rgba(241,239,250,0.94))]"
          )}
        >
          <CardHeader className={SECTION_HEADER_BASE}>
            <SectionEyebrow className="text-violet-500">{t("mbti.typeLabel")}</SectionEyebrow>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <a
                  href={`https://www.16personalities.com/${profile.mbti.type.toLowerCase()}-personality`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: getMbtiDominantGradient(profile.mbti) }}
                >
                  <span className="text-3xl font-bold tracking-tight text-white drop-shadow">
                    {profile.mbti.type}
                  </span>
                  <span className="text-xs font-semibold text-white/80">
                    -{profile.mbti.identity}
                  </span>
                </a>
                <div>
                  <div className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-violet-900 sm:text-[1.55rem]">
                    <a
                      href={`https://www.16personalities.com/${profile.mbti.type.toLowerCase()}-personality`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-violet-600 hover:underline underline-offset-2 transition-colors"
                    >
                      {t(`mbtiTypes.${profile.mbti.type}.name`, {
                        defaultValue: profile.mbti.type
                      })}
                    </a>
                    <span className="ml-1.5 text-xs font-medium text-violet-400">
                      {profile.mbti.identity === "T" ? t("mbti.turbulent") : t("mbti.assertive")}
                    </span>
                  </div>
                  <p className="mt-1 max-w-md text-sm leading-6 text-violet-700/80">
                    {t(`mbtiTypes.${profile.mbti.type}.description`, { defaultValue: "" })}
                  </p>
                </div>
              </div>
              <a
                href="https://www.16personalities.com/personality-types"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-violet-500 hover:text-violet-700"
              >
                {t("mbti.viewOn16p")}
              </a>
            </div>
          </CardHeader>
          <CardContent className={SECTION_CONTENT_BASE}>
            <MbtiBarChart mbti={profile.mbti} />
            <SectionNote
              className="border-violet-200/70 bg-violet-50/55"
              iconClassName="text-violet-300"
              textClassName="text-violet-700/85"
            >
              {t("mbti.aiNote")}
            </SectionNote>
          </CardContent>
        </Card>
      ) : null}

      {showExtendedPersonaSections ? <TeamUpCard profile={profile} /> : null}

      {/* Tech Stack */}
      {!isCreatorProfile && profile.tech_stack && profile.tech_stack.length > 0 && (
        <TechStackCard items={profile.tech_stack} />
      )}

      {/* Goals & vision */}
      {showExtendedPersonaSections ? (
        <Card
          className={cn(
            SECTION_CARD_BASE,
            "border-slate-200 bg-[linear-gradient(160deg,rgba(252,249,242,0.98),rgba(250,245,230,0.94))]"
          )}
        >
          <CardHeader className={SECTION_HEADER_BASE}>
            <SectionEyebrow className="text-amber-600">{t("goals.sectionLabel")}</SectionEyebrow>
            <CardTitle className={cn(SECTION_TITLE_BASE, "text-amber-900")}>
              {profile.goals_vision.long_term_vision}
            </CardTitle>
          </CardHeader>
          <CardContent className={SECTION_CONTENT_BASE}>
            <SectionPanel label={t("goals.lifetimeMission")} labelClassName="text-amber-600">
              <p className="text-sm leading-6 text-amber-900">
                {profile.goals_vision.lifetime_mission}
              </p>
            </SectionPanel>
            <SectionPanel label={t("goals.currentDecade")} labelClassName="text-amber-600">
              <p className="text-sm leading-6 text-amber-900">
                {profile.goals_vision.current_decade_mission}
              </p>
            </SectionPanel>
            <SectionPanel label={t("goals.directions")} labelClassName="text-amber-600">
              <ul className="space-y-1.5">
                {profile.goals_vision.long_term_directions.map((d) => (
                  <li key={d} className="flex gap-2 text-sm leading-6 text-amber-900/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {d}
                  </li>
                ))}
              </ul>
            </SectionPanel>
          </CardContent>
        </Card>
      ) : null}

      {/* Fit vectors — radar */}
      {showExtendedPersonaSections && Object.keys(profile.fit_vectors).length > 0 ? (
        <Card className={cn(SECTION_CARD_BASE, "bg-white/94")}>
          <CardHeader className={SECTION_HEADER_BASE}>
            <SectionEyebrow className="text-slate-500">{t("vectors.sectionLabel")}</SectionEyebrow>
            <p className={SECTION_SUBTEXT_BASE}>{t("vectors.subtitle")}</p>
          </CardHeader>
          <CardContent className={SECTION_CONTENT_BASE}>
            <RadarChart vectors={profile.fit_vectors as Record<string, number>} />
            <SectionNote className="border-slate-200 bg-slate-50/80" iconClassName="text-slate-400">
              {t("vectors.aiNote")}
            </SectionNote>
          </CardContent>
        </Card>
      ) : null}

      {/* Identity shifts timeline */}
      {!isCreatorProfile ? timelineSection : null}

      {/* Strengths + weaknesses — compact */}
      {showExtendedPersonaSections ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className={cn(SECTION_CARD_BASE, "bg-white/94")}
            style={{ background: mbtiCardBg(0, 1) }}
          >
            <CardHeader className={SECTION_HEADER_BASE}>
              <SectionEyebrow className="text-slate-500">
                {t("strengths.sectionLabel")}
              </SectionEyebrow>
            </CardHeader>
            <CardContent className={cn(SECTION_CONTENT_BASE, "pt-4")}>
              <ul className="space-y-1">
                {profile.strengths.map((s) => (
                  <li key={s} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card
            className={cn(SECTION_CARD_BASE, "bg-white/94")}
            style={{ background: mbtiCardBg(3, 4) }}
          >
            <CardHeader className={SECTION_HEADER_BASE}>
              <SectionEyebrow className="text-slate-500">
                {t("watchouts.sectionLabel")}
              </SectionEyebrow>
            </CardHeader>
            <CardContent className={cn(SECTION_CONTENT_BASE, "pt-4")}>
              <ul className="space-y-1">
                {profile.watchouts.map((w) => (
                  <li key={w} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Q&A — auth-gated */}
      {showChatSection ? (
        sessionUser ? (
          <div id={isCreatorProfile ? "ai-sejong" : undefined}>
            <PersonaQAPanel
              personId={personaId}
              lang={lang}
              compact={compactChat}
              showRepoAction={creatorChatPage}
            />
          </div>
        ) : creatorChatPage ? (
          <div id="ai-sejong">
            <Card className={cn(SECTION_CARD_BASE, "bg-white/88")}>
              <CardHeader className={SECTION_HEADER_BASE}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <SectionEyebrow className="text-slate-500">{t("qa.badge")}</SectionEyebrow>
                    <CardTitle className={SECTION_TITLE_BASE}>{t("qa.title")}</CardTitle>
                    {qaDescription ? <p className={SECTION_TEXT_BASE}>{qaDescription}</p> : null}
                  </div>
                  <HupositoryButton />
                </div>
              </CardHeader>
              <CardContent className={SECTION_CONTENT_BASE}>
                <SectionNote
                  className="border-slate-200 bg-slate-50/80"
                  iconClassName="text-slate-400"
                >
                  {t("qa.disclaimer")}
                </SectionNote>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={SECTION_TEXT_BASE}>{t("loginPrompt.message")}</p>
                  <PersonaLoginActions showHowItWorks />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isCreatorProfile ? null : (
          <Card className={cn(SECTION_CARD_BASE, "bg-white/88")}>
            <CardContent className={cn(SECTION_CONTENT_BASE, "sm:py-5")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={SECTION_TEXT_BASE}>{t("loginPrompt.message")}</p>
                <PersonaLoginActions />
              </div>
            </CardContent>
          </Card>
        )
      ) : null}
    </div>
  );
}
