"use client";

import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { updatePassword, type FormState } from "../actions";
import { AuthCard } from "../auth-card";

// Reached from the reset email via /auth/callback, which signs the user in.
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updatePassword,
    {},
  );

  return (
    <AuthCard title="סיסמה חדשה" subtitle="בחרו סיסמה של 8 תווים לפחות">
      <form action={action} className="flex flex-col gap-5">
        <Label>
          סיסמה חדשה
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            dir="ltr"
            required
          />
        </Label>
        <Label>
          אימות סיסמה
          <Input name="confirm" type="password" autoComplete="new-password" dir="ltr" required />
        </Label>
        <FormMessage error={state.error} />
        <Button type="submit" size="lg" loading={pending}>
          שמירה
        </Button>
      </form>
    </AuthCard>
  );
}
