import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button } from "@/common/components";

import { CapturePageShell } from "../components";

export function ImageCapturePage() {
  const { t } = useTranslation("capture");

  return (
    <CapturePageShell
      badge={t("image.badge")}
      description={t("image.description")}
      footer={null}
      title={t("image.title")}
    >
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Badge variant="outline">{t("image.comingSoon")}</Badge>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("image.comingSoonText")}
        </p>
        <NavLink to="/capture/interview">
          <Button variant="outline">{t("image.backToInterview")}</Button>
        </NavLink>
      </div>
    </CapturePageShell>
  );
}
