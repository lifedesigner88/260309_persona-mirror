import { Form, Outlet, useLoaderData } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { StepLink } from "../components";
import type { CaptureLoaderData } from "../utils/types";

export function CaptureLayout() {
  const { t } = useTranslation("capture");
  const { completion, progressCount } = useLoaderData() as CaptureLoaderData;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,244,238,0.96))]">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Badge variant="outline">{t("layout.badge")}</Badge>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {t("layout.heading")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("layout.subheading")}
              </p>
            </div>
          </div>
          <Card className="bg-white/88">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{t("layout.progressTitle")}</CardTitle>
                <Badge variant={progressCount >= 1 ? "success" : "outline"}>{t("layout.progressSteps", { count: progressCount })}</Badge>
              </div>
              <CardDescription>{t("layout.progressDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-2 overflow-hidden rounded-full bg-secondary/80">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressCount >= 1 ? 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit bg-white/92">
          <CardHeader>
            <CardTitle className="text-lg">{t("layout.stepMapTitle")}</CardTitle>
            <CardDescription>{t("layout.stepMapDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StepLink done={completion.interview} title={t("layout.step1")} to="/capture/interview" />
            <StepLink disabled done={false} title={t("layout.step2")} to="/capture/voice" />
            <StepLink disabled done={false} title={t("layout.step3")} to="/capture/image" />
            <StepLink done={completion.interview} title={t("layout.step4")} to="/capture/review" />
          </CardContent>
          <div className="px-6 pb-6">
            <Form action="/capture/reset" method="post">
              <Button className="w-full" type="submit" variant="outline">
                {t("layout.resetDraft")}
              </Button>
            </Form>
          </div>
        </Card>

        <div className="space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
