"use client";

import { Copy } from "lucide-react";
import type { ReactNode } from "react";
import { Button, cn, Switch } from "@/components/ui";
import { DAY_NAMES } from "@/lib/business/hours";
import type { FilterDef } from "@/lib/business/load";
import type { Hours } from "@/lib/business/types";

// Shared by the business owner's editor and the admin "unclaimed business" dialog.

// ─── שעות פעילות ────────────────────────────────────────────

const DAYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function HoursEditor({
  hours,
  onChange,
  holidays,
  onHolidaysChange,
}: {
  hours: Hours;
  onChange: (hours: Hours) => void;
  holidays: boolean;
  onHolidaysChange: (v: boolean) => void;
}) {
  const setDay = (day: (typeof DAYS)[number], ranges: [string, string][] | undefined) => {
    const next: Hours = { ...hours };
    if (ranges?.length) next[day] = ranges;
    else delete next[day];
    onChange(next);
  };
  const firstOpen = DAYS.find((d) => hours[d]?.length);

  return (
    <>
      <ul className="flex flex-col gap-2">
        {DAYS.map((day) => {
          const range = hours[day]?.[0];
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
            const src = hours[firstOpen]!;
            onChange(Object.fromEntries(DAYS.filter((d) => hours[d]?.length).map((d) => [d, src])) as Hours);
          }}
        >
          <Copy className="size-4" />
          העתקת השעות של יום {DAY_NAMES[+firstOpen]} לכל הימים הפתוחים
        </Button>
      )}
      <label className="flex items-center justify-between gap-4 text-sm font-medium">
        פתוח גם בחגים
        <Switch checked={holidays} onChange={onHolidaysChange} label="פתוח בחגים" />
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

export type FeatureValues = Record<string, { bool?: boolean; options?: string[] }>;

// Yes/no and multi-select filters of one business (filters already narrowed to its category).
export function FeaturesEditor({
  filters: relevant,
  values,
  onChange,
}: {
  filters: FilterDef[];
  values: FeatureValues;
  onChange: (values: FeatureValues) => void;
}) {
  const set = (id: string, v: { bool?: boolean; options?: string[] }) => onChange({ ...values, [id]: v });

  if (!relevant.length) return <p className="text-sm text-muted">אין מאפיינים לתחום הזה.</p>;
  return (
    <>
      {relevant.map((f) =>
        f.kind === "boolean" ? (
          <label key={f.id} className="flex items-center justify-between gap-4 text-[15px] font-medium">
            {f.name}
            <Switch
              checked={!!values[f.id]?.bool}
              onChange={(v) => set(f.id, { bool: v })}
              label={f.name}
            />
          </label>
        ) : (
          <fieldset key={f.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-medium">{f.name}</legend>
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => {
                const current = values[f.id]?.options ?? [];
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

