import { useEffect, useState } from "react";
import { Form, NavLink, useActionData, useLoaderData, useNavigation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { CaptureJobStatusBadge, CapturePayloadSummary, PersonaCard } from "../components";
import { requestCaptureJob, readCaptureJobResponse } from "../utils/api";
import { formatCaptureTimestamp } from "../utils/format";
import type { CaptureJob, CaptureJobActionData, CaptureJobDetailLoaderData } from "../utils/types";

const POLLING_STATUSES = new Set(["pending", "processing"]);

export function CaptureSubmissionDetailPage() {
  const { t } = useTranslation("capture");
  const { job: initialJob, created } = useLoaderData() as CaptureJobDetailLoaderData;
  const actionData = useActionData() as CaptureJobActionData | undefined;
  const navigation = useNavigation();
  const deleting = navigation.state === "submitting";

  const [job, setJob] = useState<CaptureJob>(initialJob);
  const polling = POLLING_STATUSES.has(job.status);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      const response = await requestCaptureJob(job.id);
      if (response.ok) {
        const updated = await readCaptureJobResponse(response);
        setJob(updated);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [polling, job.id]);

  return (
    <div className="space-y-6">
      {created ? (
        <Card className="border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(240,253,250,0.94))]">
          <CardContent className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Badge variant="success">{t("detail.submittedBadge")}</Badge>
                <p className="text-sm text-foreground/80">{t("detail.submittedMessage", { id: job.id })}</p>
              </div>
              <NavLink to="/capture/submissions">
                <Button variant="outline">{t("detail.viewAll")}</Button>
              </NavLink>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{t("detail.badge")}</Badge>
              <CaptureJobStatusBadge status={job.status} />
              {polling ? (
                <span className="text-xs text-muted-foreground animate-pulse">{t("detail.analyzing")}</span>
              ) : null}
            </div>
            <CardTitle className="text-2xl">{t("detail.jobTitle", { id: job.id.slice(0, 8) })}</CardTitle>
            <CardDescription className="max-w-2xl">{t("detail.description")}</CardDescription>
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/75 px-4 py-4 text-sm text-foreground/80">
            <div>{t("detail.owner")}: {job.owner_user_id}</div>
            <div className="mt-1">{t("detail.created")}: {formatCaptureTimestamp(job.created_at)}</div>
            <div className="mt-1">{t("detail.updated")}: {formatCaptureTimestamp(job.updated_at)}</div>
          </div>
        </CardHeader>
      </Card>

      {job.status === "done" && job.result ? (
        <PersonaCard result={job.result} />
      ) : null}

      <CapturePayloadSummary payload={job.payload} />

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,240,236,0.95))]">
        <CardContent className="space-y-4 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold tracking-[-0.03em]">{t("detail.actionsTitle")}</h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("detail.actionsDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <NavLink to="/capture/submissions">
                <Button type="button" variant="outline">
                  {t("detail.backToList")}
                </Button>
              </NavLink>
              <Form
                method="post"
                onSubmit={(event) => {
                  if (!window.confirm(t("detail.deleteConfirm"))) {
                    event.preventDefault();
                  }
                }}
              >
                <input name="intent" type="hidden" value="delete" />
                <Button disabled={deleting} type="submit" variant="outline">
                  {deleting ? t("detail.deleting") : t("detail.deleteSubmission")}
                </Button>
              </Form>
            </div>
          </div>
          {actionData?.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionData.error}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
