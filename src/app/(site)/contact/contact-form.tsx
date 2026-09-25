"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { CONTACT_KINDS } from "@/lib/contact";
import { sendContact, type ContactState } from "./actions";

const SELECT =
  "glass focus-ring h-12 w-full appearance-none rounded-2xl px-4 text-base text-foreground " +
  "bg-[image:linear-gradient(45deg,transparent_50%,currentColor_50%),linear-gradient(135deg,currentColor_50%,transparent_50%)] " +
  "bg-[size:5px_5px] bg-[position:1.1rem_52%,calc(1.1rem+5px)_52%] bg-no-repeat";

export function ContactForm({
  defaults,
}: {
  defaults: { kind?: string; name?: string; email?: string; page_url?: string };
}) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, {});

  if (state.ok) {
    return (
      <div className="animate-rise flex flex-col items-center gap-3 py-4 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success">
          <CheckCircle2 className="size-7" />
        </span>
        <p className="font-semibold">ההודעה נשלחה, תודה!</p>
        <p className="text-sm text-muted">נחזור אליך למייל בהקדם.</p>
      </div>
    );
  }

  const f = { ...defaults, ...state.fields };
  return (
    <form action={action} className="flex flex-col gap-5">
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input type="hidden" name="page_url" value={f.page_url ?? ""} />
      <Label>
        נושא
        <select name="kind" defaultValue={f.kind ?? "general"} className={SELECT}>
          {Object.entries(CONTACT_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Label>
      <div className="grid gap-5 sm:grid-cols-2">
        <Label>
          שם
          <Input name="name" defaultValue={f.name} autoComplete="name" maxLength={80} required />
        </Label>
        <Label>
          מייל
          <Input name="email" type="email" dir="ltr" defaultValue={f.email} autoComplete="email" maxLength={120} required />
        </Label>
      </div>
      <Label>
        טלפון (לא חובה)
        <Input name="phone" type="tel" dir="ltr" defaultValue={state.fields?.phone} autoComplete="tel" maxLength={20} />
      </Label>
      <Label>
        הודעה
        <Textarea name="message" defaultValue={state.fields?.message} minLength={5} maxLength={3000} required />
      </Label>
      <p className="text-xs text-muted">
        נשתמש בפרטים רק כדי לטפל בפנייה. פרטים נוספים במדיניות הפרטיות.
      </p>
      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending}>
        שליחה
      </Button>
    </form>
  );
}
