"use client";

import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { signUp, type FormState } from "../actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});

  if (state.message) return <FormMessage message={state.message} />;
  const accountType = state.fields?.account_type;

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="mb-1.5 text-sm font-medium">אני…</legend>
        <AccountTypeOption
          value="pet_owner"
          label="בעל/ת חיית מחמד"
          defaultChecked={accountType !== "business_owner"}
        />
        <AccountTypeOption
          value="business_owner"
          label="בעל/ת עסק"
          defaultChecked={accountType === "business_owner"}
        />
      </fieldset>
      <Label>
        שם מלא
        <Input
          name="full_name"
          autoComplete="name"
          defaultValue={state.fields?.full_name}
          required
        />
      </Label>
      <Label>
        מייל
        <Input
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={state.fields?.email}
          required
        />
      </Label>
      <Label>
        סיסמה
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          dir="ltr"
          required
        />
      </Label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" required className="mt-1" />
        {/* TODO: קישורים לתנאי השימוש ולמדיניות הפרטיות כשיהיו מוכנים */}
        <span>קראתי ואני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות</span>
      </label>
      <FormMessage error={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "נרשם…" : "הרשמה"}
      </Button>
    </form>
  );
}

function AccountTypeOption({
  value,
  label,
  defaultChecked,
}: {
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer rounded-lg border border-border p-3 text-center text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:font-semibold">
      <input
        type="radio"
        name="account_type"
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {label}
    </label>
  );
}
