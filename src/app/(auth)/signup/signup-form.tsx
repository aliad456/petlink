"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, ChoiceTile, FormMessage, Input, Label } from "@/components/ui";
import { signUp, type FormState } from "../actions";

export function SignupForm({ defaultType }: { defaultType?: "pet_owner" | "business_owner" }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});

  if (state.message) {
    return (
      <div className="animate-rise flex flex-col items-center gap-3 py-4 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-brand">
          <MailCheck className="size-7" />
        </span>
        <p className="font-medium">{state.message}</p>
      </div>
    );
  }
  const accountType = state.fields?.account_type ?? defaultType;

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">אני…</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <ChoiceTile
            type="radio"
            name="account_type"
            value="pet_owner"
            defaultChecked={accountType !== "business_owner"}
          >
            בעל/ת חיית מחמד
          </ChoiceTile>
          <ChoiceTile
            type="radio"
            name="account_type"
            value="business_owner"
            defaultChecked={accountType === "business_owner"}
          >
            בעל/ת עסק
          </ChoiceTile>
        </div>
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
          placeholder="8 תווים לפחות"
          required
        />
      </Label>
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
          <span>
            קראתי ואני מסכים/ה ל
            <Link href="/terms" target="_blank" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
              תנאי השימוש
            </Link>
            {" "}ול
            <Link href="/privacy" target="_blank" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
              מדיניות הפרטיות
            </Link>
            , ומאשר/ת שאני בן/בת 18 ומעלה.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name="marketing" className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
          <span>אשמח לקבל עדכונים, טיפים והטבות במייל (לא חובה, אפשר לבטל בכל רגע)</span>
        </label>
      </div>
      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending}>
        יצירת חשבון
      </Button>
    </form>
  );
}
