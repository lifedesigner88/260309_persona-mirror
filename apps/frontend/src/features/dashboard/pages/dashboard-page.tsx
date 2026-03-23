import { Fragment, useEffect, useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import type { RootLoaderData } from "@/features/auth/types";
import { formatInterviewRoom, formatInterviewTimeSlot } from "@/lib/interview";
import { fetchDashboard, fetchSlotMembers } from "../api";
import type { DashboardGrid, MemberCard, SlotCell } from "../types";

const INTERVIEW_DATES = ["2026-03-19", "2026-03-20", "2026-03-21", "2026-03-22"];
const DATE_LABELS: Record<string, string> = {
  "2026-03-19": "3/19 (목)",
  "2026-03-20": "3/20 (금)",
  "2026-03-21": "3/21 (토)",
  "2026-03-22": "3/22 (일)"
};
const MOBILE_DATE_GROUPS = [
  ["2026-03-19", "2026-03-20"],
  ["2026-03-21", "2026-03-22"]
] as const;
const ROOMS = [1, 2, 3, 4, 5];
const DISPLAY_COLUMNS = 5;

type SelectedSlot = { date: string; timeSlot: number; room: number };
type SlotSummary = { filled: number; male: number; female: number };

function slotKey(date: string, timeSlot: number, room: number) {
  return `${date}|${timeSlot}|${room}`;
}

function slotSummary(cells: SlotCell[]): SlotSummary {
  return {
    filled: cells.filter((cell) => cell.color !== "gray").length,
    male: cells.filter((cell) => cell.color === "blue").length,
    female: cells.filter((cell) => cell.color === "pink").length
  };
}

function toneClass(summary: SlotSummary, isSelected: boolean) {
  if (isSelected) {
    return {
      card: "border-foreground bg-foreground text-background shadow-lg",
      meta: "text-background/80"
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
      ? "border-background/45 bg-sky-100 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
      : "border-sky-200 bg-sky-200";
  }

  if (color === "pink") {
    return isSelected
      ? "border-background/45 bg-rose-100 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]"
      : "border-rose-200 bg-rose-200";
  }

  return isSelected ? "border-white/18 bg-white/16" : "border-stone-200 bg-stone-100";
}

function timeSlotLabelClass(isActive: boolean) {
  return isActive
    ? "border-foreground bg-foreground text-background shadow-md"
    : "border-border/60 bg-white/82 text-muted-foreground hover:border-foreground/20 hover:text-foreground";
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
  timeSlot,
  room,
  cells,
  isSelected,
  onSelect
}: {
  date: string;
  timeSlot: number;
  room: number;
  cells: SlotCell[];
  isSelected: boolean;
  onSelect: (date: string, timeSlot: number, room: number) => void;
}) {
  const summary = slotSummary(cells);
  const tone = toneClass(summary, isSelected);
  const visibleCells = [...cells].sort((a, b) => a.seat - b.seat).slice(0, DISPLAY_COLUMNS);

  return (
    <button
      onClick={() => onSelect(date, timeSlot, room)}
      title={`${DATE_LABELS[date]} ${formatInterviewTimeSlot(timeSlot)} ${formatInterviewRoom(room)}`}
      aria-label={`${DATE_LABELS[date]} ${formatInterviewTimeSlot(timeSlot)} ${formatInterviewRoom(room)}`}
      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-left transition ${tone.card}`}
    >
      <span className="sr-only">{formatInterviewRoom(room)}</span>
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

function MemberCardItem({ card }: { card: MemberCard }) {
  const [copied, setCopied] = useState(false);

  function copyEmail() {
    if (!card.email) return;
    navigator.clipboard.writeText(card.email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!card.user_id) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-gray-50/90 p-3 text-center">
        <span className="text-[11px] font-medium text-muted-foreground">{card.seat}번</span>
        <span className="mt-1 text-[11px] text-muted-foreground/60">미신청</span>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-24 flex-col justify-between rounded-2xl border p-3 text-sm ${
        card.gender === "M"
          ? "border-sky-200 bg-sky-50/82"
          : card.gender === "F"
            ? "border-pink-200 bg-pink-50/82"
            : "border-border/60 bg-white/90"
      }`}
    >
      <div>
        <span className="text-[11px] text-muted-foreground">{card.seat}번</span>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">{card.name ?? "—"}</p>
      </div>
      <div className="mt-2 space-y-1.5">
        {card.email && (
          <button
            onClick={copyEmail}
            className="block w-full truncate rounded-lg bg-white/70 px-2 py-1 text-left text-[11px] text-muted-foreground transition hover:bg-white"
            title={card.email}
          >
            {copied ? "✓ 복사됨" : card.email}
          </button>
        )}
        <div className="flex flex-wrap gap-1.5">
          {card.github_address && (
            <a
              href={card.github_address}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/70 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white"
            >
              GitHub
            </a>
          )}
          {card.notion_url && (
            <a
              href={card.notion_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/70 px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-white"
            >
              Notion
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const navigate = useNavigate();
  const sessionUser = rootData.sessionUser;
  const canViewSlotMembers = Boolean(
    sessionUser?.is_admin || sessionUser?.applicant_status === "approved"
  );

  const [grid, setGrid] = useState<DashboardGrid | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberCard[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    fetchDashboard()
      .then(setGrid)
      .catch(() => setGrid(null))
      .finally(() => setLoadingGrid(false));
  }, []);

  async function handleSlotClick(date: string, timeSlot: number, room: number) {
    setActiveTimeSlot(timeSlot);
    setSelected({ date, timeSlot, room });
    setMembers(null);
    setMembersError(null);
    setLoadingMembers(true);

    const result = await fetchSlotMembers(date, timeSlot, room);

    setLoadingMembers(false);
    if (result.error) {
      setMembersError(result.error);
      return;
    }

    setMembers(result.data ?? []);
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

  function toggleTimeSlotHighlight(timeSlot: number) {
    setActiveTimeSlot((current) => (current === timeSlot ? null : timeSlot));
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <ShellCard className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.10),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.96))] p-4 sm:p-5 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3">
            <StatusPill label="소프트웨어마에스트로 17기" />
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                면접자 대시보드
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                현재는 4일 x 5T x 5개 분과 x 기본 5명 기준으로 500석을 열어두었습니다. 대시보드
                보드는 분과별 5개의 점으로 최대한 빠르게 훑어볼 수 있게 정리했습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-fit sm:grid-cols-3">
            {grid && (
              <div className="rounded-2xl border border-border/60 bg-white/84 px-4 py-3 text-center shadow-sm backdrop-blur">
                <div className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
                  {grid.filled_slots}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    / {grid.total_slots}
                  </span>
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  가입 현황
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-sky-700">5개 분과</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-sky-700/70">
                행 구성
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-center">
              <div className="text-lg font-semibold text-amber-700">점 5개</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-amber-700/70">
                점 표시
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
          <span className="rounded-full border border-border/60 bg-white/80 px-2.5 py-1">
            1줄 = 1분과
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1">
            <span className="h-3 w-3 rounded-full border border-sky-200 bg-sky-200" />
            남성
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1">
            <span className="h-3 w-3 rounded-full border border-rose-200 bg-rose-200" />
            여성
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
            <span className="h-3 w-3 rounded-full border border-stone-200 bg-stone-100" />
            미신청
          </span>
          {!canViewSlotMembers && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 sm:ml-auto">
              분과 클릭은 관리자 또는 합격자 인증 완료 후 가능합니다
            </span>
          )}
        </div>
      </ShellCard>

      {loadingGrid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </ShellCard>
      ) : !grid ? (
        <ShellCard>
          <p className="text-sm text-muted-foreground">데이터를 불러오지 못했습니다.</p>
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
                      {DATE_LABELS[date]}
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
                          isActiveTimeSlot
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
                                  timeSlot={timeSlot}
                                  room={room}
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
                  {DATE_LABELS[date]}
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
                      isActiveTimeSlot
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
                              timeSlot={timeSlot}
                              room={room}
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
        <ShellCard className="sticky bottom-3 z-10 border-foreground/10 bg-white/96 p-4 shadow-2xl backdrop-blur lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold sm:text-base">
                {DATE_LABELS[selected.date]} · {formatInterviewTimeSlot(selected.timeSlot)} ·{" "}
                {formatInterviewRoom(selected.room)}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                기본 5명 기준이며, 중복 신청이 있으면 최대 7명까지 표시됩니다.
              </p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setMembers(null);
                setMembersError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              닫기
            </button>
          </div>

          {loadingMembers && <p className="text-sm text-muted-foreground">불러오는 중...</p>}

          {membersError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-700">{membersError}</p>
              {!sessionUser && (
                <Button className="mt-3" size="sm" onClick={() => navigate("/auth/login")}>
                  로그인하기
                </Button>
              )}
              {sessionUser &&
                !sessionUser.is_admin &&
                sessionUser.applicant_status !== "approved" && (
                  <Button className="mt-3" size="sm" onClick={() => navigate("/verification")}>
                    합격자 인증 신청
                  </Button>
                )}
            </div>
          )}

          {members && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {members.map((card) => (
                <MemberCardItem key={card.seat} card={card} />
              ))}
            </div>
          )}
        </ShellCard>
      )}
    </div>
  );
}
