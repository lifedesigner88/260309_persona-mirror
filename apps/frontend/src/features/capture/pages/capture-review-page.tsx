import { Form, NavLink, useActionData, useNavigation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

import { CapturePayloadSummary } from "../components";
import { useCaptureRouteData } from "../utils/hooks";
import type { CaptureSubmitActionData } from "../utils/types";

export function CaptureReviewPage() {
  const { t } = useTranslation("capture");
  const { draft, completion } = useCaptureRouteData();
  const actionData = useActionData() as CaptureSubmitActionData | undefined;
  const navigation = useNavigation();
  const loading = navigation.state === "submitting";
  const ready = completion.interview;

  return (
    <div className="space-y-6">
      <Card className="bg-white/92">
        <CardHeader className="flex flex-wrap items-start justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <Badge variant={ready ? "success" : "warn"}>{t("review.badge")}</Badge>
            <CardTitle className="text-2xl">{t("review.title")}</CardTitle>
            <CardDescription className="max-w-2xl">{t("review.description")}</CardDescription>
          </div>
          <Badge variant={ready ? "success" : "warn"}>
            {ready ? t("review.readyToSubmit") : t("review.partialDraft")}
          </Badge>
        </CardHeader>
      </Card>

      <CapturePayloadSummary payload={draft} />

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,248,248,0.95))]">
        <CardContent className="space-y-4 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold tracking-[-0.03em]">{t("review.gateTitle")}</h4>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("review.gateDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <NavLink to="/capture/interview">
                <Button type="button" variant="outline">
                  {t("review.backToInterview")}
                </Button>
              </NavLink>
              <Form method="post">
                <Button disabled={!ready || loading} type="submit">
                  {loading ? t("review.submitting") : t("review.submit")}
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
