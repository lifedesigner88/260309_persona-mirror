import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, ShellCard, Textarea } from "@/common/components";
import { cn } from "@/lib/utils";

import { saveTeamFitFitCheck } from "../api";
import type {
  TeamFitCandidateDirectoryItem,
  TeamFitConversationPriorityRecommendation,
  TeamFitFitCheckUpdate,
  TeamFitInterviewTurn,
  TeamFitRejectedCandidate
} from "../types";

const TYPE_TONE_CLASS: Record<TeamFitConversationPriorityRecommendation["type"], string> = {
  safe_fit: "border-emerald-200 bg-emerald-50 text-emerald-700",
  complementary_fit: "border-sky-200 bg-sky-50 text-sky-700",
  wildcard_fit: "border-violet-200 bg-violet-50 text-violet-700"
};

const TYPE_PANEL_CLASS: Record<TeamFitConversationPriorityRecommendation["type"], string> = {
  safe_fit: "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.96))]",
  complementary_fit:
    "border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.94),rgba(255,255,255,0.96))]",
  wildcard_fit:
    "border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.94),rgba(255,255,255,0.96))]"
};

const LOW_SIGNAL_PANEL_CLASS =
  "border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.96))]";

const DETAIL_KEYS = [
  "problem_resonance",
  "role_complementarity",
  "work_style",
  "value_alignment",
  "conversation_potential"
] as const;

function roleLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  value: string | null | undefined
) {
  if (!value) {
    return "";
  }

  return t(`teamfit.recommendationV2.role.${value}`, { defaultValue: value });
}

function useDialogLock(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);
}

function DetailSection({
  body,
  label
}: {
  body: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/75 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function ReasonDetailGrid({
  emptyBody,
  reasonDetail,
}: {
  emptyBody?: string;
  reasonDetail?: TeamFitConversationPriorityRecommendation["reason_detail"] | null;
}) {
  const { t } = useTranslation("common");

  return (
    <>
      {DETAIL_KEYS.map((key) => (
        <DetailSection
          key={key}
          label={t(`teamfit.recommendationV2.detail.${key}`)}
          body={reasonDetail?.[key] ?? emptyBody ?? t("teamfit.directory.detailUnavailable")}
        />
      ))}
    </>
  );
}

function FitCheckPanel({
  targetUserId,
  initialFitNote,
  initialFitScore,
  onSaved,
}: {
  targetUserId: number;
  initialFitNote?: string | null;
  initialFitScore?: number | null;
  onSaved?: () => void;
}) {
  const { t } = useTranslation("common");
  const [fitScore, setFitScore] = useState(initialFitScore ?? 50);
  const [fitNote, setFitNote] = useState(initialFitNote ?? "");
  const [fitSaving, setFitSaving] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);

  useEffect(() => {
    setFitScore(initialFitScore ?? 50);
    setFitNote(initialFitNote ?? "");
    setFitError(null);
    setFitSaving(false);
  }, [initialFitNote, initialFitScore, targetUserId]);

  async function handleFitSave() {
    setFitSaving(true);
    setFitError(null);

    try {
      await saveTeamFitFitCheck(targetUserId, {
        fit_score: fitScore,
        fit_note: fitNote.trim() || null,
      } satisfies TeamFitFitCheckUpdate);
      onSaved?.();
    } catch (saveError) {
      setFitError(
        saveError instanceof Error ? saveError.message : t("teamfit.errors.fitCheckSaveFailed")
      );
    } finally {
      setFitSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/75 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("teamfit.recommendationV2.fitSectionTitle")}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {t("teamfit.recommendationV2.fitSectionBody")}
          </p>
        </div>
        <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
          {t("teamfit.recommendationV2.fitScoreValue", { score: fitScore })}
        </Badge>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-slate-900">
          {t("teamfit.recommendationV2.fitScoreLabel")}
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={fitScore}
          onChange={(event) => setFitScore(Number(event.target.value))}
          disabled={fitSaving}
          className="mt-3 h-2 w-full cursor-pointer accent-slate-900"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-slate-900">
          {t("teamfit.recommendationV2.fitNoteLabel")}
        </label>
        <Textarea
          value={fitNote}
          onChange={(event) => setFitNote(event.target.value)}
          placeholder={t("teamfit.recommendationV2.fitNotePlaceholder")}
          autoGrow
          minRows={3}
          maxLength={500}
          disabled={fitSaving}
          className="mt-3 rounded-[20px]"
        />
      </div>

      {fitError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fitError}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={() => void handleFitSave()}
          disabled={fitSaving}
          className="bg-slate-950 text-white hover:bg-slate-800"
        >
          {fitSaving
            ? t("teamfit.recommendationV2.savingFit")
            : t("teamfit.recommendationV2.saveFit")}
        </Button>
      </div>
    </div>
  );
}

function CandidateDetailDialog({
  open,
  onClose,
  badge,
  name,
  summary,
  problemStatement,
  offeredRole,
  sdgs,
  mbti,
  isVerified,
  email,
  githubAddress,
  notionUrl,
  children
}: {
  open: boolean;
  onClose: () => void;
  badge: ReactNode;
  name: string;
  summary: string;
  problemStatement: string;
  offeredRole?: string | null;
  sdgs: string[];
  mbti?: string | null;
  isVerified: boolean;
  email?: string | null;
  githubAddress?: string | null;
  notionUrl?: string | null;
  children?: ReactNode;
}) {
  const { t } = useTranslation("common");

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={t("teamfit.recommendationV2.close")}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-3xl">
        <ShellCard className="max-h-[88vh] overflow-y-auto rounded-[30px] border-white/80 bg-white/97 p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {badge}
                <Badge className="border-slate-200 bg-slate-50 text-slate-700" variant="outline">
                  {isVerified
                    ? t("teamfit.recommendationV2.verified")
                    : t("teamfit.recommendationV2.unverified")}
                </Badge>
                {mbti ? (
                  <Badge className="border-rose-200 bg-rose-50 text-rose-700" variant="outline">
                    {mbti}
                  </Badge>
                ) : null}
              </div>

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("teamfit.recommendationV2.detailTitle")}
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{summary}</p>
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("teamfit.recommendationV2.close")}
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailSection label={t("teamfit.recommendationV2.problemLabel")} body={problemStatement} />
            <DetailSection
              label={t("teamfit.recommendationV2.roleLabel")}
              body={offeredRole || t("teamfit.recommendationV2.roleUnknown")}
            />
          </div>

          {sdgs.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/75 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("teamfit.recommendationV2.sdgLabel")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {sdgs.map((sdg) => (
                  <Badge
                    key={sdg}
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                    variant="outline"
                  >
                    {t(`teamfit.options.impact.${sdg}`, { defaultValue: sdg })}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {children}

          {email || githubAddress || notionUrl ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/75 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("teamfit.recommendationV2.contactLabel")}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {t("teamfit.recommendationV2.contact.email")}
                  </a>
                ) : null}
                {githubAddress ? (
                  <a
                    href={githubAddress}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {t("teamfit.recommendationV2.contact.github")}
                  </a>
                ) : null}
                {notionUrl ? (
                  <a
                    href={notionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {t("teamfit.recommendationV2.contact.notion")}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </ShellCard>
      </div>
    </div>,
    document.body
  );
}

function InterviewHistoryDialog({
  open,
  onClose,
  name,
  history,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  history: TeamFitInterviewTurn[];
}) {
  const { t } = useTranslation("common");

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label={t("teamfit.recommendationV2.close")}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-2xl">
        <ShellCard className="max-h-[84vh] overflow-y-auto rounded-[30px] border-white/80 bg-white/97 p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("teamfit.recommendationV2.interviewHistoryLabel")}
              </div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {t("teamfit.recommendationV2.interviewHistoryTitle")}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                {t("teamfit.recommendationV2.interviewHistoryDescription", { name })}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("teamfit.recommendationV2.close")}
            </Button>
          </div>

          {history.length ? (
            <div className="mt-5 space-y-4">
              {history.map((turn) => (
                <div key={turn.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="space-y-3 text-sm leading-6 text-slate-800">
                    <p className="whitespace-pre-wrap">
                      <span className="font-semibold text-slate-500">Q : </span>
                      {turn.question}
                    </p>
                    <p className="whitespace-pre-wrap text-slate-700">
                      <span className="font-semibold text-slate-500">A : </span>
                      {turn.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/75 px-4 py-5 text-sm text-slate-600">
              {t("teamfit.recommendationV2.interviewHistoryEmpty")}
            </div>
          )}
        </ShellCard>
      </div>
    </div>,
    document.body
  );
}

export function TeamFitConversationPriorityCard({
  recommendation,
  onFitSaved,
}: {
  recommendation: TeamFitConversationPriorityRecommendation;
  onFitSaved?: () => void;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const translatedRole = roleLabel(t, recommendation.offered_role);

  function closeDetailDialog() {
    setHistoryOpen(false);
    setOpen(false);
  }

  useDialogLock(open, closeDetailDialog);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition md:aspect-[16/10] md:min-h-0",
          "min-h-[220px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)]",
          TYPE_PANEL_CLASS[recommendation.type]
        )}
      >
        <div className="flex h-full flex-col justify-start gap-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={TYPE_TONE_CLASS[recommendation.type]} variant="outline">
                  {t(`teamfit.recommendationV2.type.${recommendation.type}`)}
                </Badge>
                {translatedRole ? (
                  <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
                  {translatedRole}
                </Badge>
              ) : null}
            </div>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-400">
              {t("teamfit.recommendationV2.openDetails")}
            </span>
          </div>

          <div className="min-w-0">
            <h4 className="truncate text-lg font-semibold text-slate-950">{recommendation.name}</h4>
            <p className="mt-2 line-clamp-5 text-sm leading-6 text-slate-600">
              {recommendation.reason_summary}
            </p>
          </div>
        </div>
      </button>

      <CandidateDetailDialog
        open={open}
        onClose={closeDetailDialog}
        badge={
          <Badge className={TYPE_TONE_CLASS[recommendation.type]} variant="outline">
            {t(`teamfit.recommendationV2.type.${recommendation.type}`)}
          </Badge>
        }
        name={recommendation.name}
        summary={recommendation.reason_summary}
        problemStatement={recommendation.problem_statement}
        offeredRole={translatedRole}
        sdgs={recommendation.sdgs}
        mbti={recommendation.mbti}
        isVerified={recommendation.is_verified}
        email={recommendation.email}
        githubAddress={recommendation.github_address}
        notionUrl={recommendation.notion_url}
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReasonDetailGrid reasonDetail={recommendation.reason_detail} />
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {t("teamfit.recommendationV2.interviewHistoryLabel")}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {t("teamfit.recommendationV2.interviewHistoryBody")}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {t("teamfit.recommendationV2.interviewHistoryCta")}
            </span>
          </button>
        </div>

        <FitCheckPanel
          targetUserId={recommendation.user_id}
          onSaved={() => {
            closeDetailDialog();
            onFitSaved?.();
          }}
        />
      </CandidateDetailDialog>

      <InterviewHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        name={recommendation.name}
        history={recommendation.history}
      />
    </>
  );
}

export function TeamFitDeferredCandidateCard({
  candidate
}: {
  candidate: TeamFitRejectedCandidate;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const translatedRole = roleLabel(t, candidate.offered_role);

  useDialogLock(open, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-[20px] border px-4 py-4 text-left shadow-sm transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
          "hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]",
          LOW_SIGNAL_PANEL_CLASS
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
                {t("teamfit.recommendationV2.laterBadge")}
              </Badge>
              {translatedRole ? (
                <Badge className="border-slate-200 bg-white text-slate-600" variant="outline">
                  {translatedRole}
                </Badge>
              ) : null}
            </div>
            <div>
              <h4 className="truncate text-base font-semibold text-slate-950">{candidate.name}</h4>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{candidate.reason}</p>
            </div>
          </div>

          <span className="shrink-0 text-xs font-medium text-slate-400">
            {t("teamfit.recommendationV2.openDetails")}
          </span>
        </div>
      </button>

      <CandidateDetailDialog
        open={open}
        onClose={() => setOpen(false)}
        badge={
          <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
            {t("teamfit.recommendationV2.laterBadge")}
          </Badge>
        }
        name={candidate.name}
        summary={candidate.reason}
        problemStatement={candidate.problem_statement}
        offeredRole={translatedRole}
        sdgs={candidate.sdgs}
        mbti={candidate.mbti}
        isVerified={candidate.is_verified}
        email={candidate.email}
        githubAddress={candidate.github_address}
        notionUrl={candidate.notion_url}
      >
        <div className="mt-4">
          <DetailSection label={t("teamfit.recommendationV2.laterReasonLabel")} body={candidate.reason} />
        </div>
      </CandidateDetailDialog>
    </>
  );
}

export function TeamFitCandidateDirectoryCard({
  candidate,
  onFitSaved,
}: {
  candidate: TeamFitCandidateDirectoryItem;
  onFitSaved?: () => void;
}) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const translatedRole = roleLabel(t, candidate.offered_role);

  function closeDetailDialog() {
    setHistoryOpen(false);
    setOpen(false);
  }

  useDialogLock(open, closeDetailDialog);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-[24px] border px-4 py-4 text-left shadow-sm transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.1)]",
          candidate.has_teamfit_profile ? LOW_SIGNAL_PANEL_CLASS : "border-slate-200 bg-white"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "border",
                  candidate.has_teamfit_profile
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
                variant="outline"
              >
                {candidate.has_teamfit_profile
                  ? t("teamfit.directory.hasTeamfit")
                  : t("teamfit.directory.noTeamfit")}
              </Badge>
              {typeof candidate.fit_score === "number" ? (
                <Badge className="border-rose-200 bg-rose-50 text-rose-700" variant="outline">
                  {t("teamfit.directory.fitScoreBadge", { score: candidate.fit_score })}
                </Badge>
              ) : null}
              {translatedRole ? (
                <Badge className="border-slate-200 bg-white text-slate-700" variant="outline">
                  {translatedRole}
                </Badge>
              ) : null}
            </div>
            <div>
              <h4 className="truncate text-base font-semibold text-slate-950">{candidate.name}</h4>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                {candidate.reason_summary}
              </p>
            </div>
          </div>

          <span className="shrink-0 text-xs font-medium text-slate-400">
            {t("teamfit.recommendationV2.openDetails")}
          </span>
        </div>
      </button>

      <CandidateDetailDialog
        open={open}
        onClose={closeDetailDialog}
        badge={
          <Badge
            className={cn(
              "border",
              candidate.has_teamfit_profile
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            )}
            variant="outline"
          >
            {candidate.has_teamfit_profile
              ? t("teamfit.directory.hasTeamfit")
              : t("teamfit.directory.noTeamfit")}
          </Badge>
        }
        name={candidate.name}
        summary={candidate.reason_summary}
        problemStatement={
          candidate.problem_statement || t("teamfit.directory.noProfileProblemStatement")
        }
        offeredRole={translatedRole}
        sdgs={candidate.sdgs}
        mbti={candidate.mbti}
        isVerified={candidate.is_verified}
        email={candidate.email}
        githubAddress={candidate.github_address}
        notionUrl={candidate.notion_url}
      >
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReasonDetailGrid
            reasonDetail={candidate.reason_detail}
            emptyBody={
              candidate.has_teamfit_profile
                ? t("teamfit.directory.detailPending")
                : t("teamfit.directory.detailUnavailable")
            }
          />
          {candidate.has_teamfit_profile ? (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
            >
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("teamfit.recommendationV2.interviewHistoryLabel")}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {t("teamfit.recommendationV2.interviewHistoryBody")}
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-950">
                {t("teamfit.recommendationV2.interviewHistoryCta")}
              </span>
            </button>
          ) : (
            <DetailSection
              label={t("teamfit.recommendationV2.interviewHistoryLabel")}
              body={t("teamfit.directory.interviewUnavailable")}
            />
          )}
        </div>

        <FitCheckPanel
          targetUserId={candidate.user_id}
          initialFitScore={candidate.fit_score}
          initialFitNote={candidate.fit_note}
          onSaved={() => {
            closeDetailDialog();
            onFitSaved?.();
          }}
        />
      </CandidateDetailDialog>

      <InterviewHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        name={candidate.name}
        history={candidate.history}
      />
    </>
  );
}
