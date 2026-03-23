import { useRef, useState, useCallback } from "react";
import { useLoaderData, useRouteLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/common/components";
import type { RootLoaderData } from "@/features/auth";

import { requestPersonaAsk } from "../utils/api";
import type { MbtiProfile, PersonaProfile, PersonaQAMessage } from "../utils/types";

// ─── Markdown export ─────────────────────────────────────────────────────────

function buildProfileMarkdown(p: import("../utils/types").PersonaProfile): string {
  const lines: string[] = [];

  lines.push(`# ${p.archetype}`);
  lines.push(`> ${p.headline}`);
  lines.push("");
  lines.push(p.one_liner);
  lines.push("");

  lines.push(`## Top Values`);
  p.top3_values.forEach((v) => lines.push(`- ${v}`));
  lines.push("");

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
    lines.push(`## SDG Alignment (AI prediction)`);
    p.sdg_alignment.forEach((s) =>
      lines.push(`- SDG ${s.sdg} — ${s.label} (${s.resonance})`)
    );
    lines.push("");
  }

  lines.push(`## Strengths`);
  p.strengths.forEach((s) => lines.push(`- ${s}`));
  lines.push("");

  lines.push(`## Watch Outs`);
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
  profile: PersonaProfile;
};

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
  const cx = 230, cy = 210, r = 120, max = 5;
  const VW = 520, VH = 420;

  function point(level: number, i: number) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return {
      x: cx + (level / max) * r * Math.cos(angle),
      y: cy + (level / max) * r * Math.sin(angle),
    };
  }

  function toPolyPoints(level: number) {
    return entries.map((_, i) => { const p = point(level, i); return `${p.x},${p.y}`; }).join(" ");
  }

  const dataPoints = entries.map(([, val], i) => { const p = point(val, i); return `${p.x},${p.y}`; }).join(" ");

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full mx-auto">
      <defs>
        <radialGradient id="radarFill" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          {entries.map((_, i) => (
            <stop key={i} offset={`${Math.round(((i + 1) / n) * 100)}%`} stopColor={axisColor(i, n)} stopOpacity="0.22" />
          ))}
        </radialGradient>
      </defs>
      {/* Grid rings */}
      {[1, 2, 3, 4, 5].map((lvl) => (
        <polygon key={lvl} points={toPolyPoints(lvl)} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="1" />
      ))}
      {/* Colored axis spokes */}
      {entries.map((_, i) => {
        const p = point(max, i);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={axisColor(i, n)} strokeWidth="1.5" strokeOpacity="0.35" />;
      })}
      {/* Gradient-filled polygon */}
      <polygon points={dataPoints} fill="url(#radarFill)" stroke="none" />
      {/* Colored edge segments between each adjacent data point */}
      {entries.map(([, val], i) => {
        const a = point(val, i);
        const b = point(entries[(i + 1) % n][1], (i + 1) % n);
        const color = axisColor(i, n);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />;
      })}
      {/* Colored data point dots */}
      {entries.map(([, val], i) => {
        const p = point(val, i);
        return <circle key={i} cx={p.x} cy={p.y} r="5" fill={axisColor(i, n)} stroke="white" strokeWidth="1.5" />;
      })}
      {/* Labels — colored to match axis */}
      {entries.map(([key, val], i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const lr = r + 44;
        const lx = cx + lr * Math.cos(angle);
        const ly = cy + lr * Math.sin(angle);
        const anchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
        const raw = t(`vectorLabels.${key}`, { returnObjects: true, defaultValue: [key.replace(/_/g, " ")] }) as unknown;
        const [line1, line2] = Array.isArray(raw) ? raw as [string, string?] : [String(raw)];
        const color = axisColor(i, n);
        const scoreY = ly + (line2 ? 22 : 10);
        return (
          <g key={key}>
            <text textAnchor={anchor} fontSize="11" fill={color} fontWeight="700">
              <tspan x={lx} dy={`${ly - (line2 ? 8 : 2)}`}>{line1}</tspan>
              {line2 && <tspan x={lx} dy="13">{line2}</tspan>}
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
    key:        "introverted" as const,
    left: "I", leftKey:  "introverted", leftUrl:  "https://www.16personalities.com/articles/mind-introverted-vs-extraverted",
    right: "E", rightKey: "extraverted", rightUrl: "https://www.16personalities.com/articles/mind-introverted-vs-extraverted",
    gradient:   "linear-gradient(to right, #3730a3, #7c3aed, #e9d5ff, #fcd34d, #d97706)",
    leftColor:  "#3730a3",
    rightColor: "#d97706",
  },
  {
    key:        "intuitive" as const,
    left: "N", leftKey:  "intuitive",   leftUrl:  "https://www.16personalities.com/articles/energy-intuitive-vs-observant",
    right: "S", rightKey: "observant",  rightUrl: "https://www.16personalities.com/articles/energy-intuitive-vs-observant",
    gradient:   "linear-gradient(to right, #0e7490, #22d3ee, #a5f3fc, #6ee7b7, #059669)",
    leftColor:  "#0e7490",
    rightColor: "#059669",
  },
  {
    key:        "feeling" as const,
    left: "F", leftKey:  "feeling",     leftUrl:  "https://www.16personalities.com/articles/nature-thinking-vs-feeling",
    right: "T", rightKey: "thinking",   rightUrl: "https://www.16personalities.com/articles/nature-thinking-vs-feeling",
    gradient:   "linear-gradient(to right, #be185d, #f472b6, #fbcfe8, #bae6fd, #0369a1)",
    leftColor:  "#be185d",
    rightColor: "#0369a1",
  },
  {
    key:        "judging" as const,
    left: "J", leftKey:  "judging",     leftUrl:  "https://www.16personalities.com/articles/tactics-judging-vs-prospecting",
    right: "P", rightKey: "prospecting", rightUrl: "https://www.16personalities.com/articles/tactics-judging-vs-prospecting",
    gradient:   "linear-gradient(to right, #b45309, #fbbf24, #fef9c3, #bbf7d0, #15803d)",
    leftColor:  "#b45309",
    rightColor: "#15803d",
  },
  {
    key:        "turbulent" as const,
    left: "T", leftKey:  "turbulent",   leftUrl:  "https://www.16personalities.com/articles/identity-assertive-vs-turbulent",
    right: "A", rightKey: "assertive",  rightUrl: "https://www.16personalities.com/articles/identity-assertive-vs-turbulent",
    gradient:   "linear-gradient(to right, #b91c1c, #f87171, #fecdd3, #ddd6fe, #6d28d9)",
    leftColor:  "#b91c1c",
    rightColor: "#6d28d9",
  },
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
      {MBTI_ROWS.map(({ key, left, leftKey, leftUrl, right, rightKey, rightUrl, gradient, leftColor, rightColor }) => {
        const leftLabel = t(`mbtiDimensions.${leftKey}`);
        const rightLabel = t(`mbtiDimensions.${rightKey}`);
        const score = mbti.scores[key]; // 0–100 toward left pole
        const dominant = score >= 50;
        const thumbColor = dominant ? leftColor : rightColor;
        return (
          <div key={key} className="flex items-center gap-3">
            {/* Left pole */}
            <div className="w-28 flex items-center justify-end gap-1.5 shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <a href={leftUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline underline-offset-2" style={{ color: leftColor }}>{leftLabel}</a>
                <span className="text-xs font-bold tabular-nums" style={{ color: leftColor }}>{score}%</span>
              </div>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-opacity"
                style={{ background: leftColor, opacity: dominant ? 1 : 0.25 }}
              >
                {left}
              </span>
            </div>

            {/* Gradient bar */}
            <div className="relative flex-1 h-3.5 rounded-full shadow-inner" style={{ background: gradient }}>
              {/* center tick */}
              <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/50 -translate-x-px rounded-full" />
              {/* thumb */}
              <div
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white shadow-md transition-all duration-500"
                style={{ left: `${score}%`, boxShadow: `0 0 0 2px ${thumbColor}, 0 2px 6px rgba(0,0,0,0.18)` }}
              />
            </div>

            {/* Right pole */}
            <div className="w-28 flex items-center gap-1.5 shrink-0">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white transition-opacity"
                style={{ background: rightColor, opacity: !dominant ? 1 : 0.25 }}
              >
                {right}
              </span>
              <div className="hidden sm:flex flex-col">
                <a href={rightUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium hover:underline underline-offset-2" style={{ color: rightColor }}>{rightLabel}</a>
                <span className="text-xs font-bold tabular-nums" style={{ color: rightColor }}>{100 - score}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SdgBadge({ sdg, label, resonance }: { sdg: number; label: string; resonance: string }) {
  const nn = String(sdg).padStart(2, "0");
  const iconUrl = `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${nn}.jpg`;
  const goalUrl = `https://sdgs.un.org/goals/goal${sdg}`;
  const ring = resonance === "high" ? "ring-2 ring-teal-400" : "ring-1 ring-zinc-200";
  return (
    <a
      href={goalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-white/80 px-3 py-3 text-xs transition hover:bg-white ${ring}`}
    >
      <img
        src={iconUrl}
        alt={`SDG ${sdg}`}
        width={64}
        height={64}
        className="rounded-xl"
      />
      <div className="text-center leading-4 text-muted-foreground">{label}</div>
    </a>
  );
}

// ─── Q&A panel (auth-gated) ───────────────────────────────────────────────────

function PersonaQAPanel({ personId }: { personId: string }) {
  const { t } = useTranslation("persona");
  const [messages, setMessages] = useState<PersonaQAMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleAsk() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const response = await requestPersonaAsk(personId, question);
      if (response.ok) {
        const data = (await response.json()) as { answer: string };
        setMessages((prev) => [...prev, { role: "persona", content: data.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: "persona", content: t("qa.errorMessage") }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "persona", content: t("qa.errorMessage") }]);
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

  return (
    <Card className="bg-white/94">
      <CardHeader className="gap-2">
        <Badge variant="outline">{t("qa.badge")}</Badge>
        <CardTitle className="text-lg">{t("qa.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("qa.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/60 p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "border border-teal-200 bg-teal-50 text-teal-900"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading ? (
              <div className="flex gap-3">
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 animate-pulse">
                  {t("qa.thinking")}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("qa.placeholder")}
            className="min-h-[72px] resize-none"
            disabled={loading}
          />
          <Button onClick={handleAsk} disabled={loading || !input.trim()} className="self-end">
            {t("qa.ask")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("qa.hint")}</p>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PersonaPage() {
  const { t } = useTranslation("persona");
  const { profile } = useLoaderData() as PersonaLoaderData;
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const sessionUser = rootData?.sessionUser ?? null;

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

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <Card className="border-teal-200 bg-[linear-gradient(160deg,rgba(240,253,250,0.98),rgba(236,254,255,0.92))]">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t("hero.badge")}</Badge>
            <Badge variant="success">{profile.person_id}</Badge>
            {profile.title && (
              <span className="text-xs font-medium text-muted-foreground">{profile.title}</span>
            )}
          </div>
          <CardTitle className="text-3xl tracking-[-0.04em]">{profile.archetype}</CardTitle>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{profile.one_liner}</p>
          <p className="text-xs text-muted-foreground/70">{profile.headline}</p>
          {(profile.email || profile.github_address) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                  </svg>
                  {profile.email}
                </a>
              )}
              {profile.github_address && (
                <a
                  href={profile.github_address}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50/70 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" clipRule="evenodd" />
                  </svg>
                  {profile.github_address.replace("https://github.com/", "@")}
                </a>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("hero.topValues")}
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.top3_values.map((v) => (
                <span
                  key={v}
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800"
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Copy CTA */}
          <button
            onClick={handleCopy}
            className="w-full rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-3.5 text-left transition hover:bg-teal-50 active:scale-[0.99] group"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-teal-800">
                  {copied ? t("hero.copiedHeading") : t("hero.copyHeading")}
                </div>
                <div className="mt-0.5 text-xs text-teal-600/80">
                  {copied ? t("hero.copiedSubtext") : t("hero.copySubtext")}
                </div>
              </div>
              <span className="shrink-0 rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 shadow-sm group-hover:border-teal-400 transition">
                {copied ? t("hero.copiedBtn") : t("hero.copyBtn")}
              </span>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* MBTI */}
      {profile.mbti ? (
        <Card className="border-violet-200 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(237,233,254,0.92))]">
          <CardContent className="space-y-3 px-5 py-5">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <a
                  href={`https://www.16personalities.com/${profile.mbti.type.toLowerCase()}-personality`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl shadow-lg transition-opacity hover:opacity-90"
                  style={{ background: getMbtiDominantGradient(profile.mbti) }}
                >
                  <span className="text-3xl font-bold tracking-tight text-white drop-shadow">{profile.mbti.type}</span>
                  <span className="text-xs font-semibold text-white/80">-{profile.mbti.identity}</span>
                </a>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-500">{t("mbti.typeLabel")}</div>
                  <div className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-violet-900">
                    <a
                      href={`https://www.16personalities.com/${profile.mbti.type.toLowerCase()}-personality`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-violet-600 hover:underline underline-offset-2 transition-colors"
                    >
                      {t(`mbtiTypes.${profile.mbti.type}.name`, { defaultValue: profile.mbti.type })}
                    </a>
                    <span className="ml-1.5 text-xs font-medium text-violet-400">
                      {profile.mbti.identity === "T" ? t("mbti.turbulent") : t("mbti.assertive")}
                    </span>
                  </div>
                  <p className="mt-0.5 max-w-md text-xs leading-5 text-violet-700/80">
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
            {/* Bar chart */}
            <MbtiBarChart mbti={profile.mbti} />
            {/* AI prediction note */}
            <div className="flex items-start gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3">
              <span className="mt-0.5 text-violet-400">✦</span>
              <p className="text-xs leading-5 text-violet-600">{t("mbti.aiNote")}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Goals & vision */}
      <Card className="bg-[linear-gradient(160deg,rgba(255,251,235,0.98),rgba(254,243,199,0.88))] border-amber-200">
        <CardHeader className="gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t("goals.sectionLabel")}</div>
          <CardTitle className="text-lg tracking-[-0.03em] text-amber-900">
            {profile.goals_vision.long_term_vision}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t("goals.lifetimeMission")}</div>
            <p className="mt-1 text-sm leading-6 text-amber-900">{profile.goals_vision.lifetime_mission}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white/70 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t("goals.currentDecade")}</div>
            <p className="mt-1 text-sm leading-6 text-amber-900">{profile.goals_vision.current_decade_mission}</p>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">{t("goals.directions")}</div>
            <ul className="space-y-1.5">
              {profile.goals_vision.long_term_directions.map((d) => (
                <li key={d} className="flex gap-2 text-sm leading-6 text-amber-900/80">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Fit vectors — radar */}
      {Object.keys(profile.fit_vectors).length > 0 ? (
        <Card className="bg-white/94">
          <CardHeader className="gap-1">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("vectors.sectionLabel")}</div>
            <p className="text-xs leading-5 text-muted-foreground/70">{t("vectors.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadarChart vectors={profile.fit_vectors as Record<string, number>} />
            <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-zinc-50/60 px-4 py-3">
              <span className="mt-0.5 text-zinc-400">✦</span>
              <p className="text-xs leading-5 text-zinc-500">{t("vectors.aiNote")}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* SDG alignment */}
      {profile.sdg_alignment.length > 0 ? (
        <Card className="bg-white/94" style={{ background: mbtiCardBg(2, 3) }}>
          <CardHeader>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("sdg.sectionLabel")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {profile.sdg_alignment.map((s) => (
                <SdgBadge key={s.sdg} {...s} />
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-zinc-50/60 px-4 py-3">
              <span className="mt-0.5 text-zinc-400">✦</span>
              <p className="text-xs leading-5 text-zinc-500">{t("sdg.aiNote")}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Identity shifts timeline */}
      {profile.identity_shifts.length > 0 ? (() => {
        const mbtiColors = profile.mbti ? getMbtiDominantColors(profile.mbti) : [];
        return (
          <Card className="bg-white/94" style={{ background: mbtiCardBg(0, 4, 160) }}>
            <CardHeader>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {t("timeline.sectionLabel")}
              </div>
            </CardHeader>
            <CardContent>
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
                            style={{ background: `linear-gradient(to bottom, ${color}, ${mbtiColors[(i + 1) % mbtiColors.length] ?? color})` }}
                          />
                        )}
                      </div>
                      <div className="pb-5">
                        <div className="text-xs font-bold tracking-wide" style={{ color }}>{shift.period}</div>
                        <div className="mt-0.5 text-sm font-semibold text-foreground">{shift.label}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{shift.note}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })() : null}

      {/* Strengths + watchouts — compact */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="bg-white/94" style={{ background: mbtiCardBg(0, 1) }}>
          <CardContent className="px-4 py-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("strengths.sectionLabel")}</div>
            <ul className="space-y-1">
              {profile.strengths.map((s) => (
                <li key={s} className="flex gap-2 text-xs leading-5 text-foreground/75">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-500" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/94" style={{ background: mbtiCardBg(3, 4) }}>
          <CardContent className="px-4 py-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("watchouts.sectionLabel")}</div>
            <ul className="space-y-1">
              {profile.watchouts.map((w) => (
                <li key={w} className="flex gap-2 text-xs leading-5 text-foreground/75">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Q&A — auth-gated */}
      {sessionUser ? (
        <PersonaQAPanel personId={profile.person_id} />
      ) : (
        <Card className="bg-white/88">
          <CardContent className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t("loginPrompt.message")}</p>
              <a href="/auth/login">
                <Button variant="outline" size="sm">{t("loginPrompt.loginBtn")}</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
