"use client";

import { useActionState } from "react";
import { Button, Card, FormMessage, Input, Label } from "@/components/ui";
import { updatePassword, type FormState } from "../actions";

// Reached from the reset email via /auth/callback, which signs the user in.
export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updatePassword,
    {},
  );

  return (
    <Card>
      <h1 className="mb-6 text-2xl font-bold">בחירת סיסמה חדשה</h1>
      <form action={action} className="flex flex-col gap-4">
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
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            dir="ltr"
            required
          />
        </Label>
        <FormMessage error={state.error} />
        <Button type="submit" disabled={pending}>
          שמירה
        </Button>
      </form>
    </Card>
  );
}
