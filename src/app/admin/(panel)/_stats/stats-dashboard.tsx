"use client";

import { Building2, Eye, Globe, PawPrint, UserCheck, UserPlus, Users, UserX } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentType, type CSSProperties } from "react";
import { Card, SectionTitle, cn } from "@/components/ui";
import { PERIODS, type SiteStats } from "@/lib/stats";

const nf = new Intl.NumberFormat("he-IL");
const dayFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "UTC" });
const fmtDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`));

type PeriodKey = (typeof PERIODS)[number]["key"];

const METRICS: {
  key: keyof SiteStats["periods"]["1"];
  label: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { key: "visitors", label: "מבקרים", hint: "אנשים שונים (לפי יום)", icon: Users },
  { key: "pageviews", label: "צפיות בדפים", hint: "כל פתיחה של עמוד", icon: Eye },
  { key: "members", label: "מחוברים", hint: "משתמשים רשומים שנכנסו", icon: UserCheck },
  { key: "guests", label: "אורחים", hint: "מבקרים בלי חשבון", icon: UserX },
  { key: "signups", label: "הרשמות חדשות", hint: "חשבונות שנפתחו", icon: UserPlus },
  { key: "businesses", label: "עסקים חדשים", hint: "נוספו לאתר", icon: Building2 },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "דף הבית",
  "/search": "חיפוש",
  "/deals": "מבצעים",
  "/login": "התחברות",
  "/signup": "הרשמה",
  "/account": "החשבון שלי",
  "/account/pets/new": "הוספת חיית מחמד",
  "/business/new": "הוספת עסק",
  "/contact": "צור קשר",
};

export function StatsDashboard({ stats }: { stats: SiteStats }) {
  const [period, setPeriod] = useState<PeriodKey>("1");
  const current = stats.periods[period];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">תנועה באתר</h2>
          <div role="tablist" aria-label="תקופה" className="glass-lite flex gap-1 rounded-full p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "focus-ring rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  period === p.key ? "bg-brand text-brand-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {METRICS.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={m.key}
                className="animate-rise glass-lite flex flex-col gap-1 rounded-2xl p-4"
                style={{ "--i": i } as CSSProperties}
              >
                <span className="flex items-center gap-1.5 text-sm text-muted">
                  <Icon className="size-4" />
                  {m.label}
                </span>
                <span className="text-3xl font-extrabold tabular-nums">{nf.format(current[m.key])}</span>
                <span className="text-xs text-muted">{m.hint}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyBars
          title="מבקרים ביום"
          unit="מבקרים"
          color="var(--chart-1)"
          data={stats.series.map((d) => ({ day: d.day, value: d.visitors }))}
        />
        <DailyBars
          title="הרשמות ביום"
          unit="הרשמות"
          color="var(--chart-2)"
          data={stats.series.map((d) => ({ day: d.day, value: d.signups }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankList
          title="דפים נצפים (שבוע)"
          empty="עוד אין צפיות"
          rows={stats.top_pages.map((p) => ({
            key: p.path,
            label: PAGE_NAMES[p.path] ?? p.path,
            ltr: !PAGE_NAMES[p.path],
            value: p.views,
          }))}
        />
        <RankList
          title="עסקים נצפים (שבוע)"
          empty="עוד אין צפיות בעסקים"
          rows={stats.top_businesses.map((b) => ({
            key: String(b.public_id),
            label: b.name,
            href: `/b/${b.public_id}`,
            value: b.views,
          }))}
        />
        <RankList
          title="מאיפה הגיעו (שבוע)"
          empty="עוד אין הפניות מאתרים אחרים"
          icon={Globe}
          rows={stats.referrers.map((r) => ({ key: r.referrer, label: r.referrer, ltr: true, value: r.visitors }))}
        />
      </div>

      <Card className="grid grid-cols-3 gap-3 text-center">
        <Total icon={Users} label="משתמשים" value={stats.totals.users} />
        <Total icon={PawPrint} label="חיות מחמד" value={stats.totals.pets} />
        <Total icon={Building2} label="עסקים פעילים" value={stats.totals.businesses} />
      </Card>
    </div>
  );
}

function Total({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Icon className="size-5 text-muted" />
      <span className="text-2xl font-extrabold tabular-nums">{nf.format(value)}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

// עמודות יומיות ל-30 יום. בכיוון הקריאה: הימים הישנים מימין, היום משמאל.
function DailyBars({
  title,
  unit,
  color,
  data,
}: {
  title: string;
  unit: string;
  color: string;
  data: { day: string; value: number }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const shown = active != null ? data[active] : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold">{title}</h3>
        <span className="text-sm text-muted">
          {shown ? (
            <>
              <b className="tabular-nums text-foreground">{nf.format(shown.value)}</b> {unit} ב-{fmtDay(shown.day)}
            </>
          ) : (
            <>
              <b className="tabular-nums text-foreground">{nf.format(total)}</b> ב-30 יום
            </>
          )}
        </span>
      </div>

      <div className="relative pt-4">
        <div className="pointer-events-none absolute inset-x-0 top-4 border-t border-dashed border-border" />
        <span className="pointer-events-none absolute top-0 end-0 text-[11px] leading-none tabular-nums text-muted">
          {nf.format(max)}
        </span>
        <div className="flex h-36 items-end border-b border-border" onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              className="focus-ring group flex h-full flex-1 items-end px-px outline-none"
              aria-label={`${fmtDay(d.day)}: ${d.value} ${unit}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <span
                className="block w-full rounded-t-[4px] transition-opacity"
                style={{
                  height: d.value ? `${Math.max(3, (d.value / max) * 100)}%` : "2px",
                  background: d.value ? color : "var(--border)",
                  opacity: active == null || active === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{data[0] && fmtDay(data[0].day)}</span>
        <span>היום</span>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">הצג כטבלה</summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-muted">
              <th className="text-start font-medium">תאריך</th>
              <th className="text-end font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.day} className="border-t border-border">
                <td className="py-1">{fmtDay(d.day)}</td>
                <td className="py-1 text-end tabular-nums">{nf.format(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

function RankList({
  title,
  empty,
  rows,
  icon: Icon,
}: {
  title: string;
  empty: string;
  rows: { key: string; label: string; value: number; href?: string; ltr?: boolean }[];
  icon?: ComponentType<{ className?: string }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="relative overflow-hidden rounded-lg px-2.5 py-1.5">
              <span
                className="absolute inset-y-0 start-0 rounded-lg bg-[color-mix(in_oklab,var(--chart-1)_14%,transparent)]"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  {Icon && <Icon className="size-3.5 shrink-0 text-muted" />}
                  {r.href ? (
                    <Link href={r.href} target="_blank" className="truncate hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    <span dir={r.ltr ? "ltr" : undefined} className="truncate">
                      {r.label}
                    </span>
                  )}
                </span>
                <span className="tabular-nums text-muted">{nf.format(r.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
