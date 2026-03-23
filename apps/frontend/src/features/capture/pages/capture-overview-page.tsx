import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { useCaptureRouteData } from "../utils/hooks";

export function CaptureOverviewPage() {
  const { t } = useTranslation("capture");
  const { draft, nextPath, completion } = useCaptureRouteData();

  return (
    <div className="space-y-6">
      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant="outline">{t("overview.badge")}</Badge>
            <CardTitle className="text-2xl">{t("overview.title")}</CardTitle>
            <CardDescription className="max-w-2xl">{t("overview.description")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <NavLink to="/capture/submissions">
              <Button size="lg" variant="outline">
                {t("overview.viewSubmissions")}
              </Button>
            </NavLink>
            <NavLink to={nextPath}>
              <Button size="lg">{completion.interview ? t("overview.continueDraft") : t("overview.startCapture")}</Button>
            </NavLink>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,236,0.96))]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("overview.interviewTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">
                {draft.interview.isComplete
                  ? t("overview.interviewComplete")
                  : draft.interview.messages.length > 0
                    ? t("overview.interviewProgress", { count: draft.interview.messages.length })
                    : t("overview.interviewStart")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,247,246,0.96))] opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("overview.voiceTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">{t("overview.voiceSoon")}</p>
            </CardContent>
          </Card>
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,245,240,0.96))] opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("overview.imageTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground/80">{t("overview.imageSoon")}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
