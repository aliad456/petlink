"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { GoogleButton } from "@/components/auth/google-button";
import { Button, buttonClass, ChoiceTile, FormMessage, Input, Label, PasswordInput } from "@/components/ui";
import { safeNextPath } from "@/lib/auth/redirect";
import { campaignSource, type SignupSource } from "@/lib/signup";
import { signUp, type FormState } from "../actions";

export function SignupForm({
  defaultType,
  next,
  source,
}: {
  defaultType?: "pet_owner" | "business_owner";
  next?: string;
  source: SignupSource;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const errorRef = useRef<HTMLDivElement>(null);
  // Arrived from an ad (?utm_source=meta): the sign-up counts for the ad.
  const campaign = useSyncExternalStore(noop, campaignSource, () => null);
  source = campaign ?? source;
  // On a phone the message sits below the fold: bring it into view.
  useEffect(() => {
    if (state.error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  if (state.message) {
    return (
      <div className="animate-rise flex flex-col items-center gap-3 py-4 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-brand">
          <MailCheck className="size-7" />
        </span>
        <p className="font-medium">{state.message}</p>
        <p className="text-sm text-muted">לא הגיע תוך דקה? בדקו בתיקיית הספאם או &quot;קידומי מכירות&quot;.</p>
        <a
          href="https://mail.google.com/mail/u/0/#search/from%3Aheykami.co.il"
          target="_blank"
          rel="noreferrer"
          className={buttonClass({ variant: "glass", size: "sm" })}
        >
          פתיחת Gmail
        </a>
      </div>
    );
  }
  const accountType = state.fields?.account_type ?? defaultType;

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Google: pet owners only (a business owner picks the account type below). */}
      {accountType !== "business_owner" && (
        <GoogleButton next={safeNextPath(next)} source={source} divider />
      )}
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="src" value={source} />
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
        <PasswordInput
          name="password"
          autoComplete="new-password"
          minLength={8}
          dir="ltr"
          placeholder="8 תווים לפחות"
          required
        />
      </Label>
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name="terms" required defaultChecked={state.fields?.terms === "on"} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
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
          <input type="checkbox" name="marketing" defaultChecked={state.fields?.marketing === "on"} className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
          <span>אשמח לקבל עדכונים, טיפים והטבות במייל (לא חובה, אפשר לבטל בכל רגע)</span>
        </label>
      </div>
      {state.error && (
        <div ref={errorRef}>
          <FormMessage error={state.error} />
        </div>
      )}
      <Button type="submit" size="lg" loading={pending}>
        יצירת חשבון
      </Button>
    </form>
  );
}

const noop = () => () => {};
