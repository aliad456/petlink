"use client";

import { useActionState } from "react";
import { Button, Card, FormMessage, Input, Label } from "@/components/ui";
import { requestPasswordReset, type FormState } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <Card>
      <h1 className="mb-6 text-2xl font-bold">איפוס סיסמה</h1>
      {state.message ? (
        <FormMessage message={state.message} />
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <Label>
            מייל
            <Input name="email" type="email" autoComplete="email" dir="ltr" required />
          </Label>
          <FormMessage error={state.error} />
          <Button type="submit" disabled={pending}>
            שליחת קישור לאיפוס
          </Button>
        </form>
      )}
    </Card>
  );
}
