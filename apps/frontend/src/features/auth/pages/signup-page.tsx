import { useCallback, useState } from "react";
import { Form, Link, useActionData, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import { verifyOtp } from "../api";
import type { AuthActionData } from "../types";

export function SignupPage() {
  const { t } = useTranslation("auth");
  const actionData = useActionData() as AuthActionData | undefined;
  const navigate = useNavigate();
  const [showPin, setShowPin] = useState(false);

  // OTP verification state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = useCallback(async () => {
    if (!actionData?.signupEmail || otp.length !== 6) return;
    setVerifying(true);
    setOtpError(null);
    const result = await verifyOtp(actionData.signupEmail, otp);
    setVerifying(false);
    if (result.error) {
      setOtpError(result.error);
    } else {
      setVerified(true);
      setTimeout(() => navigate("/auth/login"), 2000);
    }
  }, [actionData?.signupEmail, otp]);

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
          {otpError ? (
            <p className="text-sm text-red-600">{otpError}</p>
          ) : null}
          <div className="flex justify-end">
            <Button disabled={otp.length !== 6 || verifying} onClick={handleVerify}>
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
              maxLength={4}
              minLength={4}
              name="password"
              pattern="\d{4}"
              required
              type={showPin ? "text" : "password"}
            />
            <Button size="sm" type="button" variant="outline" onClick={() => setShowPin((v) => !v)}>
              {showPin ? t("signup.hide") : t("signup.show")}
            </Button>
          </div>
        </Field>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{t("signup.pinNote")}</p>
          <Button type="submit">{t("signup.createAccount")}</Button>
        </div>
      </Form>

      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("signup.alreadyHaveAccount")}{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/auth/login">
          {t("signup.login")}
        </Link>
      </p>
    </ShellCard>
  );
}
