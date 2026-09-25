"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Button, ChoiceTile, FormMessage, Input, Label } from "@/components/ui";
import { CITIES } from "@/lib/business/cities";
import { createBusiness, type CreateState } from "@/app/business/actions";

export function NewBusinessForm({
  categories,
}: {
  categories: { id: string; name: string; icon: string | null }[];
}) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createBusiness, {});

  return (
    <form action={action} className="flex flex-col gap-6">
      <Label>
        שם העסק
        <Input name="name" defaultValue={state.fields?.name} maxLength={60} placeholder="למשל: מרפאת ד״ר יוסי" required />
      </Label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">תחום</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {categories.map((c) => (
            <ChoiceTile
              key={c.id}
              type="radio"
              name="category_id"
              value={c.id}
              defaultChecked={state.fields?.category_id === c.id}
              required
              className="justify-start gap-2.5 px-3.5 text-start"
            >
              <CategoryIcon name={c.icon} className="size-5 shrink-0" />
              <span className="leading-tight">{c.name}</span>
            </ChoiceTile>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Label>
          עיר
          <Input name="city" list="cities" defaultValue={state.fields?.city} maxLength={60} autoComplete="address-level2" required />
          <datalist id="cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Label>
        <Label>
          טלפון לעסק
          <Input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={state.fields?.phone}
            placeholder="050-0000000"
            autoComplete="tel"
            required
          />
        </Label>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" name="business_terms" required className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" />
        <span>
          קראתי ואני מסכים/ה ל
          <Link href="/business-terms" target="_blank" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
            תנאי השימוש לבעלי עסקים
          </Link>
          . אני מצהיר/ה שאני בעל/ת העסק או מורשה מטעמו, שהפרטים נכונים ושיש לי זכויות בתכנים שאעלה.
        </span>
      </label>

      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending}>
        יצירת העמוד
      </Button>
    </form>
  );
}
