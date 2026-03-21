import { useState } from "react";
import { Form, Link, useActionData } from "react-router-dom";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import type { AuthActionData } from "../types";

export function LoginPage() {
  const actionData = useActionData() as AuthActionData | undefined;
  const [showPin, setShowPin] = useState(false);

  return (
    <ShellCard className="mx-auto max-w-xl bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,248,248,0.95))]">
      <div className="space-y-2">
        <StatusPill label="Session access" />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Sign in to continue</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Session state is stored in an httpOnly cookie, so the browser cannot read the token directly.
        </p>
      </div>
      <Form className="mt-6 space-y-4" method="post">
        <Field label="Email">
          <Input autoComplete="email" name="email" required type="email" />
        </Field>
        <Field label="PIN">
          <div className="flex items-center gap-2">
            <Input
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={4}
              name="password"
              pattern="[0-9]{4}"
              placeholder="••••"
              required
              type={showPin ? "text" : "password"}
              onInput={(e) => {
                const t = e.currentTarget;
                t.value = t.value.replace(/\D/g, "").slice(0, 4);
              }}
            />
            <Button size="sm" type="button" variant="outline" onClick={() => setShowPin((v) => !v)}>
              {showPin ? "Hide" : "Show"}
            </Button>
          </div>
        </Field>
        <div className="flex items-center justify-between gap-4">
          <Link className="text-xs text-muted-foreground underline underline-offset-2" to="/auth/reset-pin">
            Forgot PIN?
          </Link>
          <Button type="submit">Login</Button>
        </div>
      </Form>
      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
          {actionData.error.includes("not verified") ? (
            <span className="ml-1">
              — <Link className="underline" to="/auth/signup">go back to verify</Link>
            </span>
          ) : null}
        </div>
      ) : null}
    </ShellCard>
  );
}
