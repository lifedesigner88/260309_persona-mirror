import { useEffect, useState } from "react";
import { useRevalidator, useRouteLoaderData } from "react-router-dom";

import { Button, ShellCard, StatusPill } from "@/common/components";
import { Input } from "@/common/components/ui/input";
import type { RootLoaderData } from "@/features/auth/types";
import { KAKAO_OPEN_CHAT_URL } from "@/lib/contact";
import { formatInterviewRoom, formatInterviewStartTime } from "@/lib/interview";
import { applyVerification } from "../api";

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
  phone: string;
  github_address: string;
  notion_url: string;
  interview_date: string;
  interview_start_time: string;
  interview_room: string;
};

function normalizeForm(form: VerificationFormState): VerificationFormState {
  return {
    ...form,
    name: form.name.trim(),
    residence: form.residence.trim(),
    phone: form.phone.trim(),
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
    phone: sessionUser?.phone ?? "",
    github_address: sessionUser?.github_address ?? "",
    notion_url: sessionUser?.notion_url ?? "",
    interview_date: sessionUser?.interview_date ?? "",
    interview_start_time: formatInterviewStartTime(sessionUser?.interview_start_time),
    interview_room: sessionUser?.interview_room ? String(sessionUser.interview_room) : ""
  };
}

function OpenChatLink() {
  return (
    <a
      href={KAKAO_OPEN_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center rounded-xl border border-rose-200 bg-white/85 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-white"
    >
      카카오톡 오픈채팅
    </a>
  );
}

export function VerificationPage() {
  const rootData = useRouteLoaderData("root") as RootLoaderData;
  const revalidator = useRevalidator();
  const sessionUser = rootData.sessionUser;
  const [form, setForm] = useState<VerificationFormState>(() => createInitialForm(sessionUser));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submittedMode, setSubmittedMode] = useState<"apply" | "edit" | null>(null);

  useEffect(() => {
    setForm(createInitialForm(sessionUser));
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

  const status = sessionUser.applicant_status ?? "none";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

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

  if (submittedMode === "apply" && successMessage) {
    return (
      <ShellCard>
        <StatusPill label="신청 완료" tone="success" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          인증 신청이 접수되었습니다
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{successMessage}</p>
        <div className="mt-4">
          <OpenChatLink />
        </div>
      </ShellCard>
    );
  }

  if (status === "pending") {
    return (
      <ShellCard>
        <StatusPill label={STATUS_LABEL["pending"]} tone="warn" />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">인증 대기 중</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          합격자 인증은 양식을 제출하신 뒤 아래 카카오톡 오픈채팅으로 들어가, 성함, 이메일, 합격자
          이메일과 본인 이메일이 함께 보이도록 캡쳐해서 보내주세요.
        </p>
        <div className="mt-4">
          <OpenChatLink />
        </div>
      </ShellCard>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedForm = normalizeForm(form);
    if (
      !normalizedForm.name ||
      !normalizedForm.gender ||
      !normalizedForm.birth_date ||
      !normalizedForm.residence ||
      !normalizedForm.phone ||
      !normalizedForm.github_address ||
      !normalizedForm.notion_url ||
      !normalizedForm.interview_date ||
      !normalizedForm.interview_start_time ||
      !normalizedForm.interview_room
    ) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    setForm(normalizedForm);
    setLoading(true);
    setError(null);
    const result = await applyVerification({
      name: normalizedForm.name,
      gender: normalizedForm.gender as "M" | "F",
      birth_date: normalizedForm.birth_date,
      residence: normalizedForm.residence,
      phone: normalizedForm.phone,
      github_address: normalizedForm.github_address,
      notion_url: normalizedForm.notion_url,
      interview_date: normalizedForm.interview_date,
      interview_start_time: normalizedForm.interview_start_time,
      interview_room: Number(normalizedForm.interview_room)
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      const nextMode = isApproved ? "edit" : "apply";
      setSubmittedMode(nextMode);
      setSuccessMessage(
        nextMode === "edit"
          ? "제출한 인증정보가 저장되었습니다."
          : [
              "합격자 인증은 양식을 제출하신 뒤 아래 카카오톡 오픈채팅으로 들어가,",
              "성함, 이메일, 합격자 이메일과 본인 이메일이 함께 보이도록 캡쳐해서 보내주세요."
            ].join(" ")
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
      : "아래 정보를 입력하고 신청하면, 관리자가 확인 후 인증을 승인합니다. 인증 완료 후 대시보드에서 동기들의 정보를 확인할 수 있습니다.";
  const submitLabel = isApproved
    ? "인증정보 저장"
    : isRejected
      ? "인증 다시 신청하기"
      : "인증 신청하기";

  return (
    <div className="space-y-6">
      <ShellCard>
        <StatusPill label={headerLabel} tone={headerTone} />
        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{heading}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-4 space-y-3 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm leading-6 text-rose-700/80">
          <p>
            노션 링크는 합격자 분들만 볼 수 있습니다. 모든 정보는 17기 인증된 합격자에게만
            공개됩니다.
          </p>
          {!isApproved && (
            <>
              <p>제출 전 기타 문의는 카카오톡 오픈채팅으로 연락해 주세요.</p>
              <OpenChatLink />
            </>
          )}
        </div>
      </ShellCard>

      <ShellCard>
        <form onSubmit={handleSubmit} className="space-y-5">
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
              <label className="text-sm font-medium">생년월일 *</label>
              <Input
                required
                type="date"
                value={form.birth_date}
                onChange={(e) => updateForm("birth_date", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">거주지 *</label>
              <Input
                required
                placeholder="서울시 강남구"
                value={form.residence}
                onChange={(e) => updateForm("residence", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">휴대폰 번호 *</label>
              <Input
                required
                type="tel"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
              />
              <p className="text-xs leading-5 text-rose-600/80">
                단톡방 초대에만 사용되며 공개되지 않습니다.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">깃허브 주소 *</label>
              <Input
                required
                type="url"
                placeholder="https://github.com/username"
                value={form.github_address}
                onChange={(e) => updateForm("github_address", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">노션 링크 *</label>
              <Input
                required
                type="url"
                placeholder="https://notion.so/..."
                value={form.notion_url}
                onChange={(e) => updateForm("notion_url", e.target.value)}
              />
              <p className="text-xs leading-5 text-rose-600/80">
                복사 권한을 제거하고 면접 볼 때 내셨던 노션 링크를 넣어주세요. 수정하셔도 됩니다.
              </p>
              <p className="text-xs leading-5 text-rose-600/80">
                노션 링크는 합격자 분들만 볼 수 있습니다.
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <h3 className="mb-4 text-sm font-semibold">면접 정보 *</h3>
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
                <p className="text-xs leading-5 text-rose-600/80">
                  이메일로 안내받은 면접 시작시간을 입력해 주세요. 내부적으로 현재 기준 타임에 자동
                  분류되며, 필요하면 추후 수정하실 수 있습니다.
                </p>
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

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? "저장 중..." : submitLabel}
          </Button>
        </form>
      </ShellCard>
    </div>
  );
}
