import { Form, useActionData } from "react-router-dom";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import type { AuthActionData } from "../types";

export function LoginPage() {
  const actionData = useActionData() as AuthActionData | undefined;

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
        <Field label="User ID">
          <Input autoComplete="username" name="user_id" required />
        </Field>
        <Field label="Password">
          <Input autoComplete="current-password" minLength={8} name="password" required type="password" />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Seeded admin is documented in the project env template.</p>
          <Button type="submit">Login</Button>
        </div>
      </Form>
      {actionData?.error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionData.error}
        </div>
      ) : null}
    </ShellCard>
  );
}
