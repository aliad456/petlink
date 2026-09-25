"use client";

import { ChevronDown, Plus, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Chip, FeaturesEditor, HoursEditor } from "@/components/business/detail-editors";
import { Button, cn, Input, Label, Textarea } from "@/components/ui";
import { CITIES } from "@/lib/business/cities";
import type { FilterDef } from "@/lib/business/load";
import { filtersForCategory } from "@/lib/business/load";
import { LANGUAGES } from "@/lib/business/types";
import type { FormState } from "./form-state";
import { useProfanity } from "./use-profanity";

export type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
type Props = { form: FormState; update: Update };

// ─── מעטפת ──────────────────────────────────────────────────

export function Panel({
  icon: Icon,
  title,
  hint,
  defaultOpen,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group glass rounded-[1.75rem] [&[open]>summary_.chev]:rotate-180">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-[1.75rem] p-5 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
          <Icon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{title}</span>
          {hint && <span className="truncate text-sm text-muted">{hint}</span>}
        </span>
        <ChevronDown className="chev size-5 text-muted transition-transform duration-300" />
      </summary>
      <div className="flex flex-col gap-5 px-5 pb-6">{children}</div>
    </details>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("text-xs font-normal tabular-nums", value.length > max * 0.9 ? "text-warning" : "text-muted")}>
      {value.length}/{max}
    </span>
  );
}

function ProfanityWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span role="alert" className="animate-rise flex items-center gap-1.5 text-sm font-medium text-danger">
      <TriangleAlert className="size-4" />
      יש כאן מילה לא מתאימה. נסחו אחרת כדי שנוכל לשמור.
    </span>
  );
}

// ─── פרטים בסיסיים ──────────────────────────────────────────

export function BasicsFields({
  form,
  update,
  categories,
}: Props & { categories: { id: string; name: string; icon: string | null }[] }) {
  const nameBad = useProfanity(form.name);
  const taglineBad = useProfanity(form.tagline);
  const bioBad = useProfanity(form.bio);

  return (
    <>
      <Label>
        שם העסק
        <Input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={60} required />
        <ProfanityWarning show={nameBad} />
      </Label>

      <Label>
        תחום
        <select
          value={form.category_id}
          onChange={(e) => update("category_id", e.target.value)}
          className="glass focus-ring h-12 w-full appearance-none rounded-2xl px-4 text-base"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Label>

      <Label>
        <span className="flex items-center justify-between">
          בועת סטטוס
          <Counter value={form.tagline} max={80} />
        </span>
        <Input
          value={form.tagline}
          onChange={(e) => update("tagline", e.target.value)}
          maxLength={80}
          placeholder="למשל: 🎉 20% הנחה על חיסונים השבוע"
        />
        <span className="text-xs font-normal text-muted">מופיעה בבועה מעל תמונת הפרופיל. מעולה למבצעים ועדכונים.</span>
        <ProfanityWarning show={taglineBad} />
      </Label>

      <Label>
        <span className="flex items-center justify-between">
          אודות
          <Counter value={form.bio} max={1500} />
        </span>
        <Textarea
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxLength={1500}
          placeholder="ספרו מי אתם, מה הניסיון שלכם ומה מיוחד אצלכם"
          className="min-h-36"
        />
        <ProfanityWarning show={bioBad} />
      </Label>
    </>
  );
}

// ─── מבצע ───────────────────────────────────────────────────

function israelDay(offset = 0) {
  const d = new Date(Date.now() + offset * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d);
}

export function DealFields({ form, update }: Props) {
  const bad = useProfanity(form.deal_text);
  const expired = form.deal_text.trim() && form.deal_until && form.deal_until < israelDay();

  return (
    <>
      <Label>
        <span className="flex items-center justify-between">
          המבצע
          <Counter value={form.deal_text} max={80} />
        </span>
        <Input
          value={form.deal_text}
          onChange={(e) => update("deal_text", e.target.value)}
          maxLength={80}
          placeholder="למשל: 20% הנחה על חיסון ראשון"
        />
        <ProfanityWarning show={bad} />
      </Label>
      <Label>
        בתוקף עד
        <Input
          type="date"
          dir="ltr"
          value={form.deal_until}
          min={israelDay()}
          max={israelDay(60)}
          onChange={(e) => update("deal_until", e.target.value)}
          required={!!form.deal_text.trim()}
        />
      </Label>
      <p className="text-xs text-muted">
        מבצע פעיל מופיע בעמוד שלכם וב״מבצעים השבוע״ בדף הבית של Kami. עד 60 יום, ואחרי תאריך הסיום הוא יורד לבד.
      </p>
      {expired && <p className="text-sm font-medium text-warning">המבצע הסתיים. עדכנו תאריך או מחקו את הטקסט.</p>}
      {form.deal_text.trim() && (
        <Button type="button" variant="glass" size="sm" className="self-start" onClick={() => { update("deal_text", ""); update("deal_until", ""); }}>
          <Trash2 className="size-4" />
          הסרת המבצע
        </Button>
      )}
    </>
  );
}

// ─── יצירת קשר ──────────────────────────────────────────────

export function ContactFields({ form, update }: Props) {
  const field = (key: keyof FormState, label: string, props: React.ComponentProps<"input"> = {}) => (
    <Label>
      {label}
      <Input
        value={form[key] as string}
        onChange={(e) => update(key, e.target.value as never)}
        dir="ltr"
        {...props}
      />
    </Label>
  );
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("phone", "טלפון", { type: "tel", placeholder: "050-0000000", autoComplete: "tel" })}
        {field("whatsapp", "וואטסאפ", { type: "tel", placeholder: "אם שונה מהטלפון" })}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("email", "מייל", { type: "email", maxLength: 120 })}
        {field("website", "אתר", { placeholder: "www.example.co.il", maxLength: 200 })}
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {field("instagram", "אינסטגרם", { placeholder: "@username", maxLength: 60 })}
        {field("facebook", "פייסבוק", { placeholder: "קישור לעמוד", maxLength: 200 })}
        {field("tiktok", "טיקטוק", { placeholder: "@username", maxLength: 60 })}
      </div>
    </>
  );
}

// ─── מיקום ──────────────────────────────────────────────────

export function LocationFields({ form, update }: Props) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Label>
          עיר
          <Input value={form.city} onChange={(e) => update("city", e.target.value)} list="edit-cities" maxLength={60} />
          <datalist id="edit-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Label>
        <Label>
          כתובת
          <Input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            maxLength={120}
            placeholder="רחוב ומספר (לניווט)"
          />
        </Label>
      </div>
      <Label>
        אזור שירות
        <Input
          value={form.service_area}
          onChange={(e) => update("service_area", e.target.value)}
          maxLength={120}
          placeholder="למשל: כל גוש דן והשרון"
        />
        <span className="text-xs font-normal text-muted">חשוב במיוחד אם אתם מגיעים לבית הלקוח.</span>
      </Label>
    </>
  );
}

// ─── ניסיון והישגים ─────────────────────────────────────────

export function ExperienceFields({ form, update }: Props) {
  const certsBad = useProfanity(form.certifications.join(" "));
  return (
    <>
      <div className="grid grid-cols-2 gap-5">
        <Label>
          שנות ניסיון
          <Input
            value={form.years_experience}
            onChange={(e) => update("years_experience", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={2}
            placeholder="12"
          />
        </Label>
        <Label>
          בעלי חיים שטופלו
          <Input
            value={form.animals_served}
            onChange={(e) => update("animals_served", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={7}
            placeholder="500"
          />
        </Label>
      </div>
      <p className="-mt-2 text-xs text-muted">המספרים מופיעים בפס ההישגים ועולים באנימציה כשגוללים אליהם.</p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">שפות</legend>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <Chip
              key={lang}
              on={form.languages.includes(lang)}
              onClick={() =>
                update(
                  "languages",
                  form.languages.includes(lang) ? form.languages.filter((l) => l !== lang) : [...form.languages, lang],
                )
              }
            >
              {lang}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">הסמכות ותעודות</legend>
        {form.certifications.map((c, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={c}
              onChange={(e) =>
                update(
                  "certifications",
                  form.certifications.map((x, j) => (j === i ? e.target.value : x)),
                )
              }
              maxLength={80}
              placeholder="למשל: מאלף מוסמך מטעם וינגייט"
              aria-label={`הסמכה ${i + 1}`}
            />
            <RemoveButton onClick={() => update("certifications", form.certifications.filter((_, j) => j !== i))} />
          </div>
        ))}
        {form.certifications.length < 12 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => update("certifications", [...form.certifications, ""])}
          >
            <Plus className="size-4" />
            הוספת הסמכה
          </Button>
        )}
        <ProfanityWarning show={certsBad} />
      </fieldset>
    </>
  );
}

// ─── שעות פעילות ────────────────────────────────────────────

export function HoursFields({ form, update }: Props) {
  return (
    <HoursEditor
      hours={form.hours}
      onChange={(h) => update("hours", h)}
      holidays={form.open_on_holidays}
      onHolidaysChange={(v) => update("open_on_holidays", v)}
    />
  );
}

// ─── מאפיינים (פילטרים) ─────────────────────────────────────

export function FeatureFields({ form, update, filters }: Props & { filters: FilterDef[] }) {
  return (
    <FeaturesEditor
      filters={filtersForCategory(filters, form.category_id)}
      values={form.filter_values}
      onChange={(v) => update("filter_values", v)}
    />
  );
}

// ─── מחירון ─────────────────────────────────────────────────

export function PriceFields({ form, update }: Props) {
  const bad = useProfanity(form.price_list.map((p) => `${p.title} ${p.note ?? ""}`).join(" "));
  const set = (i: number, patch: Partial<FormState["price_list"][number]>) =>
    update(
      "price_list",
      form.price_list.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    );

  return (
    <>
      {form.price_list.map((p, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-2xl bg-[var(--glass-bg)] p-3">
          {/* Row 1: service name + remove. Row 2: price + optional note. */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Input
                value={p.title}
                onChange={(e) => set(i, { title: e.target.value })}
                maxLength={60}
                placeholder="שם השירות"
                aria-label={`שירות ${i + 1}`}
              />
            </div>
            <RemoveButton onClick={() => update("price_list", form.price_list.filter((_, j) => j !== i))} />
          </div>
          <div className="flex gap-2">
            <div className="w-32 shrink-0">
              <Input
                value={p.price}
                onChange={(e) => set(i, { price: e.target.value })}
                maxLength={20}
                inputMode="decimal"
                placeholder="מחיר ₪"
                aria-label={`מחיר ${i + 1}`}
                className="text-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Input
                value={p.note ?? ""}
                onChange={(e) => set(i, { note: e.target.value })}
                maxLength={120}
                placeholder="הערה (לא חובה)"
                aria-label={`הערה ${i + 1}`}
              />
            </div>
          </div>
        </div>
      ))}
      {form.price_list.length < 40 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => update("price_list", [...form.price_list, { title: "", price: "" }])}
        >
          <Plus className="size-4" />
          הוספת שירות
        </Button>
      )}
      <ProfanityWarning show={bad} />
    </>
  );
}

// ─── קטנים ──────────────────────────────────────────────────

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="הסרה"
      className="pressable focus-ring inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-muted hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] hover:text-danger"
    >
      <Trash2 className="size-[18px]" />
    </button>
  );
}

