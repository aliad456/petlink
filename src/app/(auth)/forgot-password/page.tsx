"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { requestPasswordReset, type FormState } from "../actions";
import { AuthCard } from "../auth-card";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    requestPasswordReset,
    {},
  );

  return (
    <AuthCard
      title="איפוס סיסמה"
      subtitle="נשלח לכם קישור לבחירת סיסמה חדשה"
      footer={
        <Link
          href="/login"
          transitionTypes={["nav-back"]}
          className="font-semibold text-brand-strong hover:underline dark:text-brand"
        >
          חזרה להתחברות
        </Link>
      }
    >
      {state.message ? (
        <FormMessage message={state.message} />
      ) : (
        <form action={action} className="flex flex-col gap-5">
          <Label>
            מייל
            <Input name="email" type="email" autoComplete="email" dir="ltr" required />
          </Label>
          <FormMessage error={state.error} />
          <Button type="submit" size="lg" loading={pending}>
            שליחת קישור
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
