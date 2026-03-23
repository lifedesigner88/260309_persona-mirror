import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge, Button } from "@/common/components";

import { CapturePageShell } from "../components";

export function VoiceCapturePage() {
  const { t } = useTranslation("capture");

  return (
    <CapturePageShell
      badge={t("voice.badge")}
      description={t("voice.description")}
      footer={null}
      title={t("voice.title")}
    >
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Badge variant="outline">{t("voice.comingSoon")}</Badge>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t("voice.comingSoonText")}
        </p>
        <NavLink to="/capture/interview">
          <Button variant="outline">{t("voice.backToInterview")}</Button>
        </NavLink>
      </div>
    </CapturePageShell>
  );
}
