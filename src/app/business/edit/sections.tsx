"use client";

import { ChevronDown, Copy, Plus, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, cn, Input, Label, Switch, Textarea } from "@/components/ui";
import { CITIES } from "@/lib/business/cities";
import { DAY_NAMES } from "@/lib/business/hours";
import type { FilterDef } from "@/lib/business/load";
import { filtersForCategory } from "@/lib/business/load";
import { LANGUAGES, type Hours } from "@/lib/business/types";
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

const DAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function HoursFields({ form, update }: Props) {
  const setDay = (day: (typeof DAYS)[number], ranges: [string, string][] | undefined) => {
    const next: Hours = { ...form.hours };
    if (ranges?.length) next[day] = ranges;
    else delete next[day];
    update("hours", next);
  };
  const firstOpen = DAYS.find((d) => form.hours[d]?.length);

  return (
    <>
      <ul className="flex flex-col gap-2">
        {DAYS.map((day) => {
          const range = form.hours[day]?.[0];
          return (
            <li key={day} className="flex min-h-12 items-center gap-3">
              <Switch
                checked={!!range}
                onChange={(on) => setDay(day, on ? [["09:00", day === "5" ? "14:00" : "18:00"]] : undefined)}
                label={`יום ${DAY_NAMES[+day]} פתוח`}
              />
              <span className={cn("w-16 shrink-0 text-sm font-medium", !range && "text-muted")}>
                {DAY_NAMES[+day]}
              </span>
              {range ? (
                <div dir="ltr" className="flex flex-1 items-center justify-end gap-2">
                  <TimeInput value={range[0]} onChange={(v) => setDay(day, [[v, range[1]]])} label="משעה" />
                  <span className="text-muted">–</span>
                  <TimeInput value={range[1]} onChange={(v) => setDay(day, [[range[0], v]])} label="עד שעה" />
                </div>
              ) : (
                <span className="flex-1 text-end text-sm text-muted">סגור</span>
              )}
            </li>
          );
        })}
      </ul>
      {firstOpen && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            const src = form.hours[firstOpen]!;
            update(
              "hours",
              Object.fromEntries(DAYS.filter((d) => form.hours[d]?.length).map((d) => [d, src])) as Hours,
            );
          }}
        >
          <Copy className="size-4" />
          העתקת השעות של יום {DAY_NAMES[+firstOpen]} לכל הימים הפתוחים
        </Button>
      )}
      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        פתוח גם בחגים
        <Switch checked={form.open_on_holidays} onChange={(v) => update("open_on_holidays", v)} label="פתוח בחגים" />
      </label>
    </>
  );
}

function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      aria-label={label}
      className="glass focus-ring h-10 w-[6.5rem] rounded-xl px-2 text-center tabular-nums"
    />
  );
}

// ─── מאפיינים (פילטרים) ─────────────────────────────────────

export function FeatureFields({ form, update, filters }: Props & { filters: FilterDef[] }) {
  const relevant = filtersForCategory(filters, form.category_id);
  const set = (id: string, v: { bool?: boolean; options?: string[] }) =>
    update("filter_values", { ...form.filter_values, [id]: v });

  if (!relevant.length) return <p className="text-sm text-muted">אין מאפיינים לתחום הזה.</p>;
  return (
    <>
      {relevant.map((f) =>
        f.kind === "boolean" ? (
          <label key={f.id} className="flex items-center justify-between gap-4 text-[15px] font-medium">
            {f.name}
            <Switch
              checked={!!form.filter_values[f.id]?.bool}
              onChange={(v) => set(f.id, { bool: v })}
              label={f.name}
            />
          </label>
        ) : (
          <fieldset key={f.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-medium">{f.name}</legend>
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => {
                const current = form.filter_values[f.id]?.options ?? [];
                const on = current.includes(o.value);
                return (
                  <Chip
                    key={o.value}
                    on={on}
                    onClick={() =>
                      set(f.id, { options: on ? current.filter((x) => x !== o.value) : [...current, o.value] })
                    }
                  >
                    {o.label}
                  </Chip>
                );
              })}
            </div>
          </fieldset>
        ),
      )}
    </>
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
        <div key={i} className="flex flex-col gap-2 rounded-2xl bg-[var(--glass-bg)] p-3">
          <div className="flex gap-2">
            <Input
              value={p.title}
              onChange={(e) => set(i, { title: e.target.value })}
              maxLength={60}
              placeholder="שירות, למשל: חיסון משושה"
              aria-label={`שירות ${i + 1}`}
            />
            <Input
              value={p.price}
              onChange={(e) => set(i, { price: e.target.value })}
              maxLength={20}
              placeholder="₪"
              aria-label={`מחיר ${i + 1}`}
              className="w-28 shrink-0 text-center"
            />
            <RemoveButton onClick={() => update("price_list", form.price_list.filter((_, j) => j !== i))} />
          </div>
          <Input
            value={p.note ?? ""}
            onChange={(e) => set(i, { note: e.target.value })}
            maxLength={120}
            placeholder="הערה (לא חובה), למשל: כולל בדיקה"
            aria-label={`הערה ${i + 1}`}
            className="h-10 text-sm"
          />
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

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "pressable focus-ring rounded-xl px-3.5 py-2 text-sm font-medium",
        on ? "bg-brand text-brand-foreground" : "glass text-foreground/80 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

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

