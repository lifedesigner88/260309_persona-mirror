import { Form, useActionData } from "react-router-dom";

import { Button, Field, Input, ShellCard, StatusPill } from "@/common/components";

import type { AuthActionData } from "../types";

export function SignupPage() {
  const actionData = useActionData() as AuthActionData | undefined;

  return (
    <ShellCard className="mx-auto max-w-xl bg-white/92">
      <div className="space-y-2">
        <StatusPill label="New member" />
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Create a local test identity</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          This creates a normal member account. Admin access remains reserved for the seeded operator account.
        </p>
      </div>
      <Form className="mt-6 space-y-4" method="post">
        <Field label="User ID">
          <Input autoComplete="username" name="user_id" required />
        </Field>
        <Field label="Password">
          <Input autoComplete="new-password" minLength={8} name="password" required type="password" />
        </Field>
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Use 8+ characters. This account is for local dev testing.</p>
          <Button type="submit">Create account</Button>
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
