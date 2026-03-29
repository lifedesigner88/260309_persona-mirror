import { useCallback, useState } from "react";
import { Form, Link, useActionData, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import { resendVerificationCode, verifyOtp } from "../api";
import type { AuthActionData } from "../types";
import { localizeAuthError } from "../utils/localize-auth-error";

export function SignupPage() {
  const { t } = useTranslation("auth");
  const actionData = useActionData() as AuthActionData | undefined;
  const navigate = useNavigate();
  const [showPin, setShowPin] = useState(false);
  const localizedError = localizeAuthError(actionData?.error, t);

  // OTP verification state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (!actionData?.signupEmail || otp.length !== 6) return;
    setVerifying(true);
    setOtpError(null);
    setResendNotice(null);
    const result = await verifyOtp(actionData.signupEmail, otp);
    setVerifying(false);
    if (result.error) {
      setOtpError(result.error);
    } else {
      setVerified(true);
      setTimeout(() => navigate("/auth/login"), 2000);
    }
  }, [actionData?.signupEmail, otp]);

  const handleResend = useCallback(async () => {
    if (!actionData?.signupEmail) return;
    setResending(true);
    setOtpError(null);
    setResendNotice(null);
    const result = await resendVerificationCode(actionData.signupEmail);
    setResending(false);
    if (result.error) {
      setOtpError(result.error);
      return;
    }
    setResendNotice(t("signup.resendSent"));
  }, [actionData?.signupEmail, t]);

  // Step 3: Verified
  if (actionData?.signupEmail && verified) {
    return (
      <ShellCard className="mx-auto max-w-xl bg-white/92">
        <div className="space-y-2">
          <StatusPill label={t("signup.step3Pill")} />
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("signup.step3Title")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("signup.step3Description")}</p>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("signup.redirecting")}</p>
      </ShellCard>
    );
  }

  // Step 2: OTP verification
  if (actionData?.signupEmail) {
    return (
      <ShellCard className="mx-auto max-w-xl bg-white/92">
        <div className="space-y-2">
          <StatusPill label={t("signup.step2Pill")} />
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("signup.step2Title")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("signup.step2Description", { email: actionData.signupEmail })}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <Field label={t("signup.verificationCodeLabel")}>
            <Input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </Field>
          <p className="text-xs leading-6 text-muted-foreground">{t("signup.resendHint")}</p>
          {otpError ? <p className="text-sm text-red-600">{otpError}</p> : null}
          {resendNotice ? <p className="text-sm text-emerald-700">{resendNotice}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              disabled={resending || verifying}
              onClick={handleResend}
              type="button"
              variant="outline"
            >
              {resending ? t("signup.resending") : t("signup.resend")}
            </Button>
            <Button disabled={otp.length !== 6 || verifying || resending} onClick={handleVerify}>
              {verifying ? t("signup.verifying") : t("signup.verify")}
            </Button>
          </div>
        </div>
      </ShellCard>
    );
  }

  // Step 1: Signup form
  return (
    <ShellCard className="mx-auto max-w-xl bg-white/92">
      <div className="space-y-2">
        <StatusPill label={t("signup.step1Pill")} />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{t("signup.step1Title")}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{t("signup.step1Description")}</p>
      </div>

      <Form className="mt-6 space-y-4" method="post">
        <Field label={t("signup.emailLabel")} hint={t("signup.emailHint")}>
          <Input autoComplete="email" name="email" required type="email" />
        </Field>
        <Field label={t("signup.pinLabel")}>
          <div className="flex items-center gap-2">
            <Input
              autoComplete="new-password"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              name="password"
              pattern="\d{6}"
              required
              type={showPin ? "text" : "password"}
            />
            <Button size="sm" type="button" variant="outline" onClick={() => setShowPin((v) => !v)}>
              {showPin ? t("signup.hide") : t("signup.show")}
            </Button>
          </div>
        </Field>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("signup.pinNote")}</p>
          <Button className="w-full" type="submit">
            {t("signup.createAccount")}
          </Button>
        </div>
      </Form>

      {localizedError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localizedError}
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("signup.alreadyHaveAccount")}{" "}
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          to="/auth/login"
        >
          {t("signup.login")}
        </Link>
      </p>
    </ShellCard>
  );
}
