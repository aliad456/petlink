"use client";

import { useState, type CSSProperties } from "react";
import { Card, cn } from "@/components/ui";
import { SIGNUP_SOURCES } from "@/lib/signup";
import type { SignupFunnel } from "@/lib/stats";
import { RankList } from "./stats-dashboard";

const nf = new Intl.NumberFormat("he-IL");
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "–");

const RANGES = [
  { key: "7", label: "שבוע" },
  { key: "30", label: "חודש" },
] as const;

// From a visit to an active account. Each step shows how many of the step before made it,
// so the weak step (where people give up) stands out.
export function SignupFunnelCard({ data }: { data: Record<"7" | "30", SignupFunnel> }) {
  const [range, setRange] = useState<"7" | "30">("30");
  const f = data[range];
  const steps = [
    { label: "מבקרים באתר", value: f.visitors },
    { label: "פתחו את דף ההרשמה", value: f.signup_visitors, hint: "בלי מי שנרשם עם Google מחלון" },
    { label: "נרשמו", value: f.signups },
    { label: "אישרו מייל", value: f.verified, hint: "כולל Google" },
    { label: "הוסיפו חיית מחמד", value: f.with_pet },
  ];
  const max = Math.max(1, f.visitors);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">משפך הרשמה</h2>
            <p className="text-sm text-muted">
              איפה אנשים נעצרים בדרך לחשבון. {f.signups ? `${pct(f.signups, f.visitors)} מהמבקרים נרשמו.` : ""}
            </p>
          </div>
          <div role="tablist" aria-label="תקופה" className="glass-lite flex gap-1 rounded-full p-1">
            {RANGES.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={range === p.key}
                onClick={() => setRange(p.key)}
                className={cn(
                  "focus-ring rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  range === p.key ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.label} className="animate-rise flex flex-col gap-1" style={{ "--i": i } as CSSProperties}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{s.label}</span>
                  {s.hint && <span className="ms-1.5 text-xs text-muted">({s.hint})</span>}
                </span>
                <span className="shrink-0 tabular-nums">
                  <b>{nf.format(s.value)}</b>
                  {i > 0 && <span className="ms-2 text-xs text-muted">{pct(s.value, steps[i - 1].value)} מהשלב הקודם</span>}
                </span>
              </div>
              <span className="h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted)_14%,transparent)]">
                <span
                  className="block h-full rounded-full bg-[var(--chart-2)]"
                  style={{ width: s.value ? `max(4px, ${(s.value / max) * 100}%)` : 0 }}
                />
              </span>
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-2 gap-3 text-sm [&>*]:min-w-0">
          <div className="glass-lite rounded-2xl p-3">
            <span className="text-muted">נרשמו עם Google</span>
            <span className="block text-2xl font-extrabold tabular-nums">{nf.format(f.google)}</span>
            <span className="text-xs text-muted">{pct(f.google, f.signups)} מההרשמות</span>
          </div>
          <div className="glass-lite rounded-2xl p-3">
            <span className="text-muted">שמרו עסק</span>
            <span className="block text-2xl font-extrabold tabular-nums">{nf.format(f.with_favorite)}</span>
            <span className="text-xs text-muted">{pct(f.with_favorite, f.signups)} מהנרשמים</span>
          </div>
        </div>
      </Card>

      <RankList
        title={`מה הביא להרשמה (${range === "7" ? "שבוע" : "חודש"})`}
        empty="עוד אין הרשמות בתקופה הזו"
        rows={f.sources.map((s) => ({
          key: s.source,
          label: SIGNUP_SOURCES[s.source as keyof typeof SIGNUP_SOURCES] ?? s.source,
          value: s.count,
        }))}
      />
    </div>
  );
}
