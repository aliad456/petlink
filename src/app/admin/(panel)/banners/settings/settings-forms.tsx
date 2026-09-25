"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { Button, cn, Input, Label, Switch } from "@/components/ui";
import { shortDate, WEEKDAYS, type DateRule, type Reserved } from "@/lib/ads-calendar";
import { setDateRule, setWeekdayRule, updatePlacement, type AdResult } from "../actions";
import type { PlacementRow } from "../data";

const OPTIONS: { value: Reserved | null; label: string; tone: string }[] = [
  { value: null, label: "פנוי", tone: "bg-[var(--glass-bg-strong)] text-foreground" },
  { value: "adoption", label: "אימוץ", tone: "bg-emerald-500 text-white" },
  { value: "ads", label: "פרסום", tone: "bg-sky-500 text-white" },
];

function useRun() {
  const [pending, start] = useTransition();
  const run = (job: () => Promise<AdResult>, after?: () => void) =>
    start(async () => {
      const r = await job();
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok ?? "נשמר");
      after?.();
    });
  return [pending, run] as const;
}

export function WeekdayRules({ initial }: { initial: Record<number, Reserved> }) {
  const [rules, setRules] = useState(initial);
  const [, run] = useRun();

  return (
    <ul className="flex flex-col gap-2">
      {WEEKDAYS.map((name, day) => (
        <li key={day} className="flex items-center justify-between gap-3">
          <span className="w-16 font-medium">{name}</span>
          <div role="radiogroup" aria-label={`יום ${name}`} className="glass inline-flex gap-1 rounded-full p-1">
            {OPTIONS.map((o) => {
              const active = (rules[day] ?? null) === o.value;
              return (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    const next = { ...rules };
                    if (o.value) next[day] = o.value;
                    else delete next[day];
                    setRules(next);
                    run(() => setWeekdayRule(day, o.value));
                  }}
                  className={cn(
                    "pressable focus-ring rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                    active ? o.tone : "text-muted hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

const DATE_OPTIONS: { value: DateRule["reserved_for"]; label: string }[] = [
  { value: "adoption", label: "שמור לאימוץ" },
  { value: "ads", label: "שמור לפרסום" },
  { value: "open", label: "פנוי (מבטל את החוק הקבוע)" },
];

export function DateRules({ initial, today }: { initial: DateRule[]; today: string }) {
  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<DateRule["reserved_for"]>("ads");
  const [label, setLabel] = useState("");
  const [pending, run] = useRun();
  const upcoming = initial.filter((r) => r.day >= today);

  return (
    <div className="flex flex-col gap-4">
      <form
        className="grid gap-3 rounded-2xl bg-[var(--glass-bg)] p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setDateRule(date, kind, label), () => setLabel(""));
        }}
      >
        <Label>
          תאריך
          <Input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} dir="ltr" className="h-10" required />
        </Label>
        <Label>
          מה היום הזה
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DateRule["reserved_for"])}
            className="glass focus-ring h-10 w-full rounded-2xl px-3 text-base"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          שם (לא חובה)
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="למשל: ערב ראש השנה" className="h-10" />
        </Label>
        <Button type="submit" size="sm" loading={pending} className="h-10">
          <Plus className="size-4" />
          הוספה
        </Button>
      </form>

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted">אין תאריכים מיוחדים.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {upcoming.map((r) => (
            <li key={r.day} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm">
              <span className="w-14 font-bold tabular-nums">{shortDate(r.day)}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  r.reserved_for === "adoption" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  r.reserved_for === "ads" && "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                  r.reserved_for === "open" && "bg-[var(--glass-bg-strong)]",
                )}
              >
                {DATE_OPTIONS.find((o) => o.value === r.reserved_for)?.label}
              </span>
              <span className="flex-1 truncate text-muted">{r.label}</span>
              <button
                type="button"
                aria-label="הסרה"
                onClick={() => run(() => setDateRule(r.day, null, ""))}
                className="pressable focus-ring rounded-full p-1.5 text-muted hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlacementSettings({ placements }: { placements: PlacementRow[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {placements.map((p) => (
        <PlacementRowForm key={p.key} p={p} />
      ))}
    </ul>
  );
}

function PlacementRowForm({ p }: { p: PlacementRow }) {
  const [capacity, setCapacity] = useState(String(p.capacity));
  const [active, setActive] = useState(p.is_active);
  const [w, setW] = useState(String(p.image_width));
  const [h, setH] = useState(String(p.image_height));
  const [phone, setPhone] = useState(p.mobile_width != null);
  const [mw, setMw] = useState(String(p.mobile_width ?? 800));
  const [mh, setMh] = useState(String(p.mobile_height ?? 300));
  const [pending, run] = useRun();
  const num = (v: string) => v.replace(/\D/g, "").slice(0, 4);
  const ratio = Number(w) / Number(h) || 1;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 font-medium">{p.label}</p>
        <Switch checked={active} onChange={setActive} label="פעיל" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {p.kind === "gallery" ? (
          <p className="pb-2 text-sm text-muted">פוסטרים בכל גודל, זה מתחת לזה.</p>
        ) : (
          <>
            <SizeInput label="רוחב" value={w} onChange={(v) => setW(num(v))} />
            <span className="pb-2.5 text-muted">×</span>
            <SizeInput label="גובה" value={h} onChange={(v) => setH(num(v))} />
          </>
        )}
        {p.kind === "banner" && (
          <Label className="flex-row items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            תמונה נפרדת לטלפון
          </Label>
        )}
        <Label className="ms-auto w-24 text-sm">
          מודעות ביום
          <Input value={capacity} onChange={(e) => setCapacity(num(e.target.value).slice(0, 3))} inputMode="numeric" dir="ltr" className="h-10 text-center" />
        </Label>
      </div>
      {phone && p.kind === "banner" && (
        <div className="flex flex-wrap items-end gap-3">
          <SizeInput label="רוחב בטלפון" value={mw} onChange={(v) => setMw(num(v))} />
          <span className="pb-2.5 text-muted">×</span>
          <SizeInput label="גובה בטלפון" value={mh} onChange={(v) => setMh(num(v))} />
        </div>
      )}

      {/* איך הצורה תיראה, יחסית */}
      <div className={cn("flex items-center gap-3 text-xs text-muted", p.kind === "gallery" && "hidden")}>
        <span
          className="block max-h-16 max-w-[12rem] rounded-md bg-[linear-gradient(135deg,#22d3ee55,#3b82f655)] ring-1 ring-[var(--border)]"
          style={{ aspectRatio: `${w || 1} / ${h || 1}`, width: ratio >= 1 ? "12rem" : undefined, height: ratio < 1 ? "4rem" : undefined }}
        />
        <span>
          הצורה של המודעה: <span dir="ltr">{w}×{h}</span>
        </span>
      </div>

      <Button
        size="sm"
        variant="glass"
        className="self-start"
        loading={pending}
        onClick={() =>
          run(() =>
            updatePlacement(p.key, Number(capacity), active, {
              width: Number(w),
              height: Number(h),
              mobileWidth: phone && p.kind === "banner" ? Number(mw) : null,
              mobileHeight: phone && p.kind === "banner" ? Number(mh) : null,
            }),
          )
        }
      >
        שמירה
      </Button>
    </li>
  );
}

function SizeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Label className="w-24 text-sm">
      {label}
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" dir="ltr" className="h-10 text-center" />
    </Label>
  );
}
