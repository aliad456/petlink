"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, ChoiceTile, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { requestClaim, type ClaimState } from "./actions";

export function ClaimForm({
  businessId,
  defaultName,
  defaultPhone,
  isBusinessAccount,
}: {
  businessId: string;
  defaultName: string;
  defaultPhone: string;
  isBusinessAccount: boolean;
}) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(requestClaim, {});

  if (state.ok) {
    return (
      <div className="animate-rise flex flex-col items-center gap-3 py-4 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <p className="font-semibold">הבקשה התקבלה</p>
        <p className="max-w-sm text-sm text-muted">
          נציג שלנו יאמת אותה, בדרך כלל בשיחה למספר הטלפון המפורסם של העסק, ויעדכן אותך. עד אז העמוד נשאר
          כמו שהוא.
        </p>
      </div>
    );
  }

  const kind = state.fields?.kind ?? (isBusinessAccount ? "claim" : "removal");
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="business_id" value={businessId} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">מה תרצו לעשות?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <ChoiceTile type="radio" name="kind" value="claim" defaultChecked={kind === "claim"} disabled={!isBusinessAccount}>
            לנהל את העמוד
          </ChoiceTile>
          <ChoiceTile type="radio" name="kind" value="removal" defaultChecked={kind === "removal"}>
            להסיר את העמוד
          </ChoiceTile>
        </div>
        {!isBusinessAccount && (
          <p className="text-xs text-muted">
            כדי לנהל עמוד צריך{" "}
            <Link href="/signup?type=business" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
              חשבון של בעל/ת עסק
            </Link>
            . בקשת הסרה אפשר לשלוח מכל חשבון.
          </p>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Label>
          שם מלא
          <Input name="full_name" defaultValue={state.fields?.full_name ?? defaultName} maxLength={80} required />
        </Label>
        <Label>
          התפקיד שלך בעסק
          <Input name="role" defaultValue={state.fields?.role} maxLength={60} placeholder="בעלים, שותף/ה, מנהל/ת" required />
        </Label>
      </div>
      <Label>
        טלפון לחזרה
        <Input
          name="phone"
          type="tel"
          dir="ltr"
          defaultValue={state.fields?.phone ?? defaultPhone}
          placeholder="050-0000000"
          autoComplete="tel"
          required
        />
      </Label>
      <Label>
        משהו שיעזור לנו לאמת (לא חובה)
        <Textarea
          name="message"
          defaultValue={state.fields?.message}
          maxLength={1000}
          className="min-h-20"
          placeholder="למשל: מספר עוסק, קישור לאתר או לעמוד הפייסבוק של העסק"
        />
      </Label>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="declaration" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
        <span>
          אני מצהיר/ה שאני בעל/ת העסק או מורשה לפעול בשמו, ושהפרטים נכונים. ידוע לי שהתחזות היא עבירה, שהבקשה
          תיבדק ושאם אקבל את העמוד אפעל לפי{" "}
          <Link href="/business-terms" target="_blank" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
            התנאים לבעלי עסקים
          </Link>
          .
        </span>
      </label>

      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending}>
        שליחת הבקשה
      </Button>
    </form>
  );
}
