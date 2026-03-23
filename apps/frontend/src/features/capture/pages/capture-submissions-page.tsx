import { NavLink, useLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { CaptureJobCard } from "../components";
import type { CaptureJobsLoaderData } from "../utils/types";

export function CaptureSubmissionsPage() {
  const { t } = useTranslation("capture");
  const { jobs, deletedJobId } = useLoaderData() as CaptureJobsLoaderData;

  return (
    <div className="space-y-6">
      {deletedJobId ? (
        <Card className="border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(240,253,250,0.94))]">
          <CardContent className="px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <Badge variant="success">{t("submissions.deletedBadge")}</Badge>
                <p className="text-sm text-foreground/80">{t("submissions.deletedMessage", { id: deletedJobId })}</p>
              </div>
              <NavLink to="/capture">
                <Button variant="outline">{t("submissions.createAnother")}</Button>
              </NavLink>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant="outline">{t("submissions.badge")}</Badge>
            <CardTitle className="text-2xl">{t("submissions.title")}</CardTitle>
            <CardDescription className="max-w-2xl">{t("submissions.description")}</CardDescription>
          </div>
          <div className="flex gap-3">
            <NavLink to="/capture">
              <Button variant="outline">{t("submissions.backToCapture")}</Button>
            </NavLink>
            <NavLink to="/capture/interview">
              <Button>{t("submissions.startNew")}</Button>
            </NavLink>
          </div>
        </CardHeader>
      </Card>

      {jobs.length === 0 ? (
        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,242,236,0.95))]">
          <CardContent className="flex flex-col items-start gap-4 px-6 py-8">
            <Badge variant="warn">{t("submissions.emptyBadge")}</Badge>
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.03em]">{t("submissions.emptyTitle")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("submissions.emptyDescription")}</p>
            </div>
            <NavLink to="/capture/interview">
              <Button>{t("submissions.startCapture")}</Button>
            </NavLink>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {jobs.map((job) => (
            <CaptureJobCard key={job.id} job={job} to={`/capture/submissions/${job.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
