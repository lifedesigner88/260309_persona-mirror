import { useEffect, type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/common/components";
import { cn } from "@/lib/utils";

const SECTION_TEXT_BASE = "text-sm leading-6 text-slate-600";
const SECTION_CONTENT_BASE = "space-y-3 px-5 py-4 sm:px-6 sm:py-5";
const SECTION_EYEBROW_BASE = "text-[11px] font-semibold uppercase tracking-[0.14em]";
const PANEL_BASE =
  "rounded-2xl border border-white/80 bg-white/78 px-4 py-4 shadow-sm backdrop-blur-sm";
const PANEL_LABEL_BASE = "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]";

function SectionEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(SECTION_EYEBROW_BASE, className)}>{children}</div>;
}

function SectionPanel({
  children,
  className,
  label,
  labelClassName
}: {
  children: ReactNode;
  className?: string;
  label?: ReactNode;
  labelClassName?: string;
}) {
  return (
    <div className={cn(PANEL_BASE, className)}>
      {label ? <div className={cn(PANEL_LABEL_BASE, labelClassName)}>{label}</div> : null}
      {children}
    </div>
  );
}

export function TeamFitHowItWorksButton({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const dialog =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label={t("teamfit.howItWorks.close")}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/36 backdrop-blur-[2px]"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="teamfit-how-title"
              className="relative z-10 w-full max-w-3xl"
            >
              <button
                type="button"
                aria-label={t("teamfit.howItWorks.close")}
                onClick={() => setOpen(false)}
                className="absolute top-2 right-2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/90 bg-white/96 text-slate-500 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-slate-900 sm:top-3 sm:right-3"
              >
                <span className="text-xl leading-none" aria-hidden="true">
                  ×
                </span>
              </button>

              <Card className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[30px] border-white/80 bg-white/97 shadow-2xl">
                <CardHeader className="gap-3 px-5 pt-5 pb-0 pr-16 sm:px-6 sm:pt-6 sm:pr-20">
                  <div className="space-y-2">
                    <SectionEyebrow className="text-sky-600">
                      {t("teamfit.howItWorks.badge")}
                    </SectionEyebrow>
                    <CardTitle
                      id="teamfit-how-title"
                      className="text-xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.45rem]"
                    >
                      {t("teamfit.howItWorks.title")}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className={SECTION_CONTENT_BASE}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SectionPanel
                      label={t("teamfit.howItWorks.captureLabel")}
                      labelClassName="text-emerald-600"
                      className="border-emerald-200/80 bg-emerald-50/70"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("teamfit.howItWorks.captureBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("teamfit.howItWorks.embeddingLabel")}
                      labelClassName="text-sky-600"
                      className="border-sky-200/80 bg-sky-50/80"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("teamfit.howItWorks.embeddingBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("teamfit.howItWorks.rankingLabel")}
                      labelClassName="text-violet-600"
                      className="border-violet-200/80 bg-violet-50/70"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("teamfit.howItWorks.rankingBody")}</p>
                    </SectionPanel>
                    <SectionPanel
                      label={t("teamfit.howItWorks.deliveryLabel")}
                      labelClassName="text-amber-600"
                      className="border-amber-200/80 bg-amber-50/80"
                    >
                      <p className={SECTION_TEXT_BASE}>{t("teamfit.howItWorks.deliveryBody")}</p>
                    </SectionPanel>
                  </div>

                  <p className="px-1 text-[11px] leading-5 text-slate-400 sm:text-right">
                    <span className="font-semibold text-slate-500">
                      {t("teamfit.howItWorks.runtimeLabel")}
                    </span>
                    {` · ${t("teamfit.howItWorks.runtimeBody")}`}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "border-sky-300 bg-sky-50/95 text-sky-700 hover:border-sky-400 hover:bg-sky-100 hover:text-sky-800",
          className
        )}
      >
        {t("teamfit.howItWorks.button")}
      </Button>
      {dialog}
    </>
  );
}
