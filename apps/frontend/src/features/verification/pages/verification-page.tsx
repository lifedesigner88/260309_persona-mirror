import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useRevalidator, useRouteLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import { Input } from "@/common/components/ui/input";
import { deleteAccountRequest } from "@/features/auth/api";
import type { RootLoaderData } from "@/features/auth/types";
import { formatInterviewRoom, formatInterviewStartTime } from "@/lib/interview";
import { applyVerification, checkVerificationInviteCode } from "../api";

const INTERVIEW_DATES = [
  { value: "2026-03-19", label: "3월 19일 (목)" },
  { value: "2026-03-20", label: "3월 20일 (금)" },
  { value: "2026-03-21", label: "3월 21일 (토)" },
  { value: "2026-03-22", label: "3월 22일 (일)" }
];
const STATUS_LABEL: Record<string, string> = {
  none: "미신청",
  pending: "인증 대기 중",
  approved: "인증 완료",
  rejected: "인증 거부"
};

const STATUS_TONE: Record<string, "default" | "success" | "warn"> = {
  none: "default",
  pending: "warn",
  approved: "success",
  rejected: "warn"
};

type VerificationFormState = {
  name: string;
  gender: "M" | "F" | "";
  birth_date: string;
  residence: string;
  invite_code: string;
  github_address: string;
  notion_url: string;
  interview_date: string;
  interview_start_time: string;
  interview_room: string;
};

function sanitizeInviteCodeInput(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
}

function normalizeEmailForComparison(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeForm(form: VerificationFormState): VerificationFormState {
  return {
    ...form,
    name: form.name.trim(),
    residence: form.residence.trim(),
    invite_code: form.invite_code.trim(),
    github_address: form.github_address.trim(),
    notion_url: form.notion_url.trim()
  };
}

function createInitialForm(sessionUser: RootLoaderData["sessionUser"]): VerificationFormState {
  return {
    name: sessionUser?.name ?? "",
    gender: sessionUser?.gender === "M" || sessionUser?.gender === "F" ? sessionUser.gender : "",
    birth_date: sessionUser?.birth_date ?? "",
    residence: sessionUser?.residence ?? "",
    invite_code: sessionUser?.invite_code ?? "",
    github_address: sessionUser?.github_address ?? "",
    notion_url: sessionUser?.notion_url ?? "",
    interview_date: sessionUser?.interview_date ?? "",
    interview_start_time: formatInterviewStartTime(sessionUser?.interview_start_time),
    interview_room: sessionUser?.interview_room ? String(sessionUser.interview_room) : ""
  };
}

export function VerificationPage() {
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const sessionUser = rootData.sessionUser;
  const [form, setForm] = useState<VerificationFormState>(() => createInitialForm(sessionUser));
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [inviteCodeStatus, setInviteCodeStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedMode, setSubmittedMode] = useState<"apply" | "edit" | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setForm(createInitialForm(sessionUser));
    setStatusOverride(null);
  }, [sessionUser]);

  if (!sessionUser) {
    return (
      <ShellCard>
        <StatusPill label="로그인 필요" tone="warn" />
        <p className="mt-4 text-sm text-muted-foreground">
          합격자 인증 신청은 로그인 후 이용할 수 있습니다.
        </p>
      </ShellCard>
    );
  }

  const status = statusOverride ?? sessionUser.applicant_status ?? "none";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const inviteCodeRequired = !isApproved;
  const trimmedInviteCode = form.invite_code.trim();
  const inviteCodeNeedsValidation = inviteCodeRequired && trimmedInviteCode.length > 0;
  const inviteCodeBlocksSubmit =
    inviteCodeRequired &&
    (trimmedInviteCode.length === 0 ||
      inviteCodeStatus === "checking" ||
      inviteCodeStatus === "invalid");
  const showInviteCodeActivationHint = inviteCodeRequired && trimmedInviteCode.length === 0;
  const sessionEmail = sessionUser.email;
  const deleteConfirmationMatches =
    normalizeEmailForComparison(deleteConfirmationEmail).length > 0 &&
    normalizeEmailForComparison(deleteConfirmationEmail) ===
      normalizeEmailForComparison(sessionEmail);

  useEffect(() => {
    if (!inviteCodeNeedsValidation) {
      setInviteCodeStatus("idle");
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setInviteCodeStatus("checking");
      const result = await checkVerificationInviteCode(trimmedInviteCode);
      if (cancelled) {
        return;
      }
      setInviteCodeStatus(result.data?.matches_auto_approve_invite_code ? "valid" : "invalid");
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [inviteCodeNeedsValidation, trimmedInviteCode]);

  useEffect(() => {
    if (!deleteDialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleteLoading) {
        closeDeleteDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialogOpen, deleteLoading]);

  function updateForm<K extends keyof VerificationFormState>(
    key: K,
    value: VerificationFormState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    if (submittedMode === "edit") {
      setSubmittedMode(null);
      setSuccessMessage(null);
    }
  }

  function openDeleteDialog() {
    setDeleteDialogOpen(true);
    setDeleteConfirmationEmail("");
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (deleteLoading) {
      return;
    }
    setDeleteDialogOpen(false);
    setDeleteConfirmationEmail("");
    setDeleteError(null);
  }

  async function handleDeleteAccount() {
    if (!deleteConfirmationMatches) {
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    const result = await deleteAccountRequest(deleteConfirmationEmail.trim());
    setDeleteLoading(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    closeDeleteDialog();
    revalidator.revalidate();
    navigate("/", { replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedForm = normalizeForm(form);
    if (
      !normalizedForm.name ||
      !normalizedForm.gender ||
      !normalizedForm.interview_date ||
      !normalizedForm.interview_start_time ||
      !normalizedForm.interview_room
    ) {
      setError(
        !normalizedForm.name || !normalizedForm.gender
          ? "이름과 성별은 필수 입력 항목입니다."
          : "면접 날짜, 시작시간, 분과는 필수 입력 항목입니다."
      );
      return;
    }
    if (inviteCodeRequired && !normalizedForm.invite_code) {
      setError("합격자 초대코드는 필수 입력 항목입니다.");
      return;
    }
    if (inviteCodeRequired && normalizedForm.invite_code && inviteCodeStatus !== "valid") {
      setError("합격자 초대코드가 일치하지 않아 지금은 인증 신청을 제출할 수 없습니다.");
      return;
    }
    setForm(normalizedForm);
    setLoading(true);
    setError(null);
    const result = await applyVerification({
      name: normalizedForm.name,
      gender: normalizedForm.gender as "M" | "F",
      birth_date: normalizedForm.birth_date || undefined,
      residence: normalizedForm.residence || undefined,
      invite_code: normalizedForm.invite_code || undefined,
      github_address: normalizedForm.github_address || undefined,
      notion_url: normalizedForm.notion_url || undefined,
      interview_date: normalizedForm.interview_date,
      interview_start_time: normalizedForm.interview_start_time,
      interview_room: Number(normalizedForm.interview_room)
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      const nextStatus = result.data?.applicant_status ?? status;
      const nextIsApproved = nextStatus === "approved";
      const nextMode = nextIsApproved ? "edit" : "apply";
      setStatusOverride(nextStatus);
      setSubmittedMode(nextMode);
      setSuccessMessage(
        nextIsApproved && !isApproved
          ? "합격자 초대코드가 확인되어 바로 인증되었습니다."
          : nextMode === "edit"
            ? "제출한 인증정보가 저장되었습니다."
            : "24시간 내로 인증코드 확인 후 승인해드리겠습니다."
      );
      revalidator.revalidate();
    }
  }

  const headerLabel = isApproved
    ? STATUS_LABEL["approved"]
    : isRejected
      ? STATUS_LABEL["rejected"]
      : "소프트웨어마에스트로 17기";
  const headerTone = STATUS_TONE[status] ?? "default";
  const heading = isApproved
    ? "제출한 인증정보 수정"
    : isRejected
      ? "합격자 인증 재신청"
      : "합격자 인증 신청";
  const description = isApproved
    ? "현재 승인 상태입니다. 제출했던 인증 정보를 수정하면 바로 저장되며, 승인 상태는 그대로 유지됩니다."
    : isRejected
      ? "이전에 제출한 인증 정보가 거부되었습니다. 내용을 보완해서 다시 신청할 수 있습니다."
      : [
          "합격자 초대코드는 필수입니다. 코드가 맞으면 관리자 승인 없이 바로 인증됩니다.",
          "서울 + 부산 450명의 향후 네트워크를 위해 운영해볼 생각입니다."
        ].join("\n");
  const submitLabel = isApproved
    ? "인증정보 저장"
    : isRejected
      ? "인증 다시 신청하기"
      : "인증 신청하기";
  const accountDeletionCard = (
    <ShellCard className="border-rose-200/70 bg-rose-50/40">
      <StatusPill label="회원 탈퇴" tone="warn" />
      <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em]">계정을 완전히 삭제합니다</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        이메일 인증만 완료된 회원도 여기서 바로 탈퇴할 수 있습니다. 탈퇴하면 인증 정보와 팀핏 기록이
        함께 삭제되며 되돌릴 수 없습니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-slate-600">
          보안을 위해 현재 로그인한 이메일을 한 번 더 입력했을 때만 삭제 버튼이 활성화됩니다.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={openDeleteDialog}
          className="border-rose-200 bg-white text-rose-700 hover:bg-rose-100 hover:text-rose-800"
        >
          회원 탈퇴
        </Button>
      </div>
    </ShellCard>
  );
  const deleteDialog =
    deleteDialogOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="회원 탈퇴 확인 닫기"
              onClick={deleteLoading ? undefined : closeDeleteDialog}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-dialog-title"
              className="relative z-10 w-full max-w-lg"
            >
              <ShellCard className="space-y-5 rounded-[30px] border-white/80 bg-white/97 p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <StatusPill label="회원 탈퇴 확인" tone="warn" />
                    <h3
                      id="delete-account-dialog-title"
                      className="text-xl font-semibold tracking-[-0.03em] text-slate-950"
                    >
                      정말로 회원 탈퇴하시겠어요?
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      이 작업은 되돌릴 수 없고, 현재 계정에 연결된 인증 정보와 팀핏 기록도 함께
                      삭제됩니다.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deleteLoading}
                    onClick={closeDeleteDialog}
                  >
                    닫기
                  </Button>
                </div>

                <div className="rounded-[26px] border border-rose-200/70 bg-rose-50/70 p-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      현재 로그인한 이메일을 입력해 주세요
                    </label>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={sessionEmail}
                      value={deleteConfirmationEmail}
                      onChange={(event) => {
                        setDeleteConfirmationEmail(event.target.value);
                        setDeleteError(null);
                      }}
                    />
                    <p className="text-xs leading-5 text-slate-600">
                      현재 로그인 이메일: {sessionEmail}
                    </p>
                    <p className="text-xs leading-5 text-slate-500">
                      이메일이 일치할 때만 삭제 버튼이 활성화됩니다.
                    </p>
                    {deleteConfirmationEmail.trim().length > 0 && !deleteConfirmationMatches ? (
                      <p className="text-xs leading-5 text-rose-700">
                        입력한 이메일이 현재 로그인한 이메일과 일치하지 않습니다.
                      </p>
                    ) : null}
                  </div>
                </div>

                {deleteError ? (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deleteError}
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDeleteDialog}
                    disabled={deleteLoading}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    disabled={!deleteConfirmationMatches || deleteLoading}
                    onClick={handleDeleteAccount}
                    className="bg-rose-600 text-white hover:bg-rose-700"
                  >
                    {deleteLoading ? "삭제 중..." : "회원 탈퇴"}
                  </Button>
                </div>
              </ShellCard>
            </div>
          </div>,
          document.body
        )
      : null;

  if (submittedMode === "apply" && successMessage) {
    return (
      <div className="space-y-6">
        <ShellCard>
          <StatusPill label="신청 완료" tone="success" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
            인증 신청이 접수되었습니다
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{successMessage}</p>
        </ShellCard>
        {accountDeletionCard}
        {deleteDialog}
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="space-y-6">
        <ShellCard>
          <StatusPill label={STATUS_LABEL["pending"]} tone="warn" />
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">인증 대기 중</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            24시간 내로 인증코드 확인 후 승인해드리겠습니다.
          </p>
        </ShellCard>
        {accountDeletionCard}
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ShellCard>
        <StatusPill label={headerLabel} tone={headerTone} />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{heading}</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </ShellCard>

      <ShellCard>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-[26px] border border-slate-200/80 bg-[rgba(248,246,241,0.72)] px-4 py-4 sm:px-5">
            <div className="mb-4 space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">
                이름, 성별, 생년월일, 거주지, 깃허브 주소, 노션 링크
              </h3>
              <p className="text-xs leading-6 text-muted-foreground">
                이름과 성별은 필수이고, 나머지는 선택입니다. 입력한 항목만 가입 시 공개되는 데이터로
                반영됩니다.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">이름 *</label>
                <Input
                  required
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">성별 *</label>
                <div className="flex gap-3">
                  {(["M", "F"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updateForm("gender", g)}
                      className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        form.gender === g
                          ? g === "M"
                            ? "border-sky-400 bg-sky-100 text-sky-700"
                            : "border-pink-400 bg-pink-100 text-pink-700"
                          : "border-border/80 bg-white/80 text-muted-foreground hover:bg-black/5"
                      }`}
                    >
                      {g === "M" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">생년월일 (선택)</label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => updateForm("birth_date", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">거주지 (선택)</label>
                <Input
                  placeholder="서울시 강남구"
                  value={form.residence}
                  onChange={(e) => updateForm("residence", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">깃허브 주소 (선택)</label>
                <Input
                  type="url"
                  placeholder="https://github.com/username"
                  value={form.github_address}
                  onChange={(e) => updateForm("github_address", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">노션 링크 (선택)</label>
                <Input
                  type="url"
                  placeholder="https://notion.so/..."
                  value={form.notion_url}
                  onChange={(e) => updateForm("notion_url", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-emerald-200/70 bg-emerald-50/60 px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {inviteCodeRequired ? "합격자 초대코드 *" : "합격자 초대코드"}
              </label>
              <Input
                placeholder={inviteCodeRequired ? "합격자 노션에 있는 초대코드" : "------"}
                value={form.invite_code}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => updateForm("invite_code", sanitizeInviteCodeInput(e.target.value))}
              />
              <p className="text-xs leading-5 text-emerald-700/80">
                {inviteCodeRequired
                  ? "합격자들만 보는 노션에 올려둔 초대코드를 입력해 주세요. 일치하면 관리자 승인 없이 바로 인증됩니다."
                  : "이미 승인된 상태라서 수정 시에는 초대코드를 비워도 됩니다."}
              </p>
              {inviteCodeRequired ? (
                <p className="text-xs leading-5 text-slate-500">
                  영문, 숫자, 하이픈만 입력할 수 있습니다.
                </p>
              ) : null}
              {inviteCodeRequired && inviteCodeStatus === "idle" ? (
                <p className="text-xs leading-5 text-slate-500">
                  초대코드를 입력해야 인증 신청 버튼이 활성화됩니다.
                </p>
              ) : null}
              {inviteCodeRequired && inviteCodeStatus === "checking" ? (
                <p className="text-xs leading-5 text-slate-500">초대코드를 확인하고 있습니다.</p>
              ) : null}
              {inviteCodeRequired && inviteCodeStatus === "valid" ? (
                <p className="text-xs leading-5 text-sky-700">
                  일치하는 초대코드입니다. 제출하면 바로 인증됩니다.
                </p>
              ) : null}
              {inviteCodeRequired && inviteCodeStatus === "invalid" ? (
                <p className="text-xs leading-5 text-rose-700">
                  초대코드가 일치하지 않아 지금은 인증 신청 버튼이 비활성화됩니다.
                </p>
              ) : null}
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <h3 className="text-sm font-semibold">면접 정보 *</h3>
              <p className="text-xs leading-5 text-muted-foreground">
                입력하신 시간으로 인증 후 대시보드에 배치됩니다.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">면접 날짜 *</label>
                <select
                  required
                  value={form.interview_date}
                  onChange={(e) => updateForm("interview_date", e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                >
                  <option value="">날짜 선택</option>
                  {INTERVIEW_DATES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">면접 시작시간 *</label>
                <Input
                  required
                  type="time"
                  min="09:00"
                  max="16:59"
                  step="60"
                  value={form.interview_start_time}
                  onChange={(e) => updateForm("interview_start_time", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">분과 *</label>
                <select
                  required
                  value={form.interview_room}
                  onChange={(e) => updateForm("interview_room", e.target.value)}
                  className="w-full rounded-2xl border border-border/80 bg-white/80 px-3.5 py-3 text-sm outline-none transition focus:border-foreground/30 focus:ring-4 focus:ring-foreground/5"
                >
                  <option value="">분과 선택</option>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <option key={r} value={r}>
                      {formatInterviewRoom(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {submittedMode === "edit" && successMessage && (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {showInviteCodeActivationHint ? (
            <p className="text-center text-xs leading-5 text-slate-500">(초대코드 입력시 활성화)</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading || inviteCodeBlocksSubmit}
            size="lg"
            className="w-full"
          >
            {loading ? "저장 중..." : submitLabel}
          </Button>
        </form>
      </ShellCard>
      {accountDeletionCard}
      {deleteDialog}
    </div>
  );
}
