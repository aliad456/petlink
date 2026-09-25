import { CalendarCog, ChevronLeft, ChevronRight, Heart, Megaphone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, buttonClass, Card, cn } from "@/components/ui";
import { adMediaUrl } from "@/lib/ad-media";
import {
  monthGrid,
  monthKey,
  monthTitle,
  reservation,
  RESERVED_LABEL,
  shiftMonth,
  shortDate,
  WEEKDAYS_SHORT,
} from "@/lib/ads-calendar";
import { requireStaff } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { FilterTabs } from "../users/filter-tabs";
import { campaignRange, loadAdsContext, occupancy, totals, type CampaignRow } from "./data";

export const metadata: Metadata = { title: "מודעות" };

export default async function BannersPage({ searchParams }: PageProps<"/admin/banners">) {
  const staff = await requireStaff();
  const can = (p: "banners.manage" | "banners.reports") => staff.isOwner || staff.permissions.has(p);
  if (!can("banners.manage") && !can("banners.reports")) notFound();
  const manage = can("banners.manage");

  const sp = await searchParams;
  const ctx = await loadAdsContext();
  const placement = ctx.placements.find((p) => p.key === sp.p) ?? ctx.placements[0];
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthKey(ctx.today);
  const booked = occupancy(ctx.campaigns)[placement?.key ?? ""] ?? {};

  const groups = {
    live: [] as CampaignRow[],
    upcoming: [] as CampaignRow[],
    ended: [] as CampaignRow[],
  };
  for (const c of ctx.campaigns) {
    const { first, last } = campaignRange(c);
    if (!first) groups.ended.push(c);
    else if (c.days.some((d) => d.day === ctx.today)) groups.live.push(c);
    else if (first > ctx.today || (last && last > ctx.today)) groups.upcoming.push(c);
    else groups.ended.push(c);
  }
  const labelOf = Object.fromEntries(ctx.placements.map((p) => [p.key, p.label]));
  const href = (extra: Record<string, string>) =>
    `?${new URLSearchParams({ p: placement.key, month, ...extra }).toString()}`;

  return (
    <PageTransition>
      <div className="flex max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">מודעות וימי אימוץ</h1>
            <p className="mt-1 text-muted">לוח שנה לכל מיקום באתר. לחיצה על יום פנוי פותחת מודעה חדשה באותו יום.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {manage && (
              <Link href="/admin/banners/settings" className={buttonClass({ variant: "glass" })}>
                <CalendarCog className="size-4" />
                ימים שמורים והגדרות
              </Link>
            )}
            {manage && (
              <Link href={`/admin/banners/new?placement=${placement.key}`} className={buttonClass()}>
                <Plus className="size-4" />
                מודעה חדשה
              </Link>
            )}
          </div>
        </header>

        <FilterTabs
          param="p"
          current={placement.key === ctx.placements[0]?.key ? null : placement.key}
          searchParams={{ month }}
          tabs={ctx.placements.map((p, i) => ({ value: i === 0 ? null : p.key, label: p.label.split(" — ")[0] }))}
        />

        {/* לוח שנה */}
        <Card className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Link href={href({ month: shiftMonth(month, -1) })} aria-label="החודש הקודם" className={buttonClass({ variant: "glass", size: "sm" })}>
              <ChevronRight className="size-4" />
            </Link>
            <div className="text-center">
              <h2 className="text-lg font-bold">{monthTitle(month)}</h2>
              <p className="text-xs text-muted">
                {placement.label} · עד {placement.capacity} {placement.capacity === 1 ? "מודעה" : "מודעות"} ביום
                {!placement.is_active && " · המיקום כבוי"}
              </p>
            </div>
            <Link href={href({ month: shiftMonth(month, 1) })} aria-label="החודש הבא" className={buttonClass({ variant: "glass", size: "sm" })}>
              <ChevronLeft className="size-4" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
            <Legend className="bg-emerald-400/25" label={RESERVED_LABEL.adoption} />
            <Legend className="bg-sky-400/25" label={RESERVED_LABEL.ads} />
            <Legend className="bg-violet-500/80" label="מודעה" />
            <Legend className="bg-rose-400/80" label="יום אימוץ" />
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
            {WEEKDAYS_SHORT.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {monthGrid(month).map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day, di) => {
                  if (!day) return <span key={di} />;
                  const { reserved, label } = reservation(day, ctx.rules);
                  const names = booked[day] ?? [];
                  const full = names.length >= placement.capacity;
                  const past = day < ctx.today;
                  const cell = (
                    <>
                      <span className={cn("text-xs font-bold tabular-nums", day === ctx.today && "rounded-full bg-brand px-1.5 text-white")}>
                        {Number(day.slice(8))}
                      </span>
                      {label && <span className="hidden truncate text-[10px] text-muted sm:block">{label}</span>}
                      <span className="mt-auto flex flex-col gap-0.5">
                        {names.slice(0, 3).map((n, i) => (
                          <span
                            key={i}
                            title={n.advertiser}
                            className={cn(
                              "h-1.5 rounded-full sm:h-auto sm:truncate sm:px-1 sm:py-0.5 sm:text-[10px] sm:font-medium sm:text-white",
                              n.kind === "adoption" ? "bg-rose-400/80" : "bg-violet-500/80",
                            )}
                          >
                            <span className="hidden sm:inline">{n.advertiser}</span>
                          </span>
                        ))}
                      </span>
                    </>
                  );
                  const cls = cn(
                    "flex min-h-14 flex-col items-start gap-0.5 overflow-hidden rounded-xl border border-[var(--border)] p-1.5 text-start sm:min-h-20",
                    reserved === "adoption" && "bg-emerald-400/15",
                    reserved === "ads" && "bg-sky-400/15",
                    past && "opacity-45",
                  );
                  return manage && !past && !full ? (
                    <Link
                      key={day}
                      href={`/admin/banners/new?placement=${placement.key}&day=${day}`}
                      title={`${shortDate(day)} · ${names.length}/${placement.capacity}${reserved ? ` · ${RESERVED_LABEL[reserved]}` : ""}`}
                      className={cn(cls, "pressable focus-ring hover:border-brand")}
                    >
                      {cell}
                    </Link>
                  ) : (
                    <div key={day} className={cls} title={`${shortDate(day)} · ${names.length}/${placement.capacity}`}>
                      {cell}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>

        {/* רשימות */}
        {(
          [
            ["live", "רצות היום"],
            ["upcoming", "מתוכננות"],
            ["ended", "הסתיימו"],
          ] as const
        ).map(([key, title]) =>
          groups[key].length === 0 ? null : (
            <section key={key} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">
                {title} <span className="text-muted">({groups[key].length})</span>
              </h2>
              <ul className="flex flex-col gap-2.5">
                {groups[key].map((c, i) => {
                  const r = campaignRange(c);
                  const t = totals(c);
                  const price = ctx.payments[c.id];
                  return (
                    <li key={c.id} className="animate-rise" style={{ "--i": i } as CSSProperties}>
                      <Link
                        href={`/admin/banners/${c.id}`}
                        className="glass-lite pressable focus-ring flex items-center gap-4 rounded-[1.5rem] p-3 pe-4"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                        <img
                          src={adMediaUrl(c.image_path)!}
                          alt=""
                          className={cn("shrink-0 rounded-xl object-cover", c.placement === "popup" ? "h-16 w-9" : "h-12 w-30")}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-2 font-bold">
                            {c.advertiser}
                            {c.kind === "adoption" ? (
                              <Badge tone="danger">
                                <Heart className="size-3" /> אימוץ
                              </Badge>
                            ) : (
                              <Badge tone="brand">
                                <Megaphone className="size-3" /> מודעה
                              </Badge>
                            )}
                            {c.status === "paused" && <Badge tone="warning">מושהית</Badge>}
                          </span>
                          <span className="truncate text-sm text-muted">
                            {labelOf[c.placement]} · {r.first ? `${shortDate(r.first)}–${shortDate(r.last)} (${r.count} ימים)` : "בלי ימים"}
                          </span>
                        </div>
                        <div className="hidden text-end text-sm sm:block">
                          <div className="font-semibold tabular-nums">{t.impressions.toLocaleString("he-IL")} חשיפות</div>
                          <div className="text-muted tabular-nums">
                            {t.clicks.toLocaleString("he-IL")} לחיצות · {t.ctr.toFixed(1)}%
                          </div>
                        </div>
                        {price != null && (
                          <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)] px-2.5 py-1 text-sm font-semibold text-success tabular-nums">
                            ₪{price.toLocaleString("he-IL")}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
        )}

        {ctx.campaigns.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <Megaphone className="size-10 text-muted" />
            <p className="font-semibold">עוד אין מודעות</p>
            <p className="max-w-sm text-sm text-muted">
              התחילו מ״ימים שמורים והגדרות״ — למשל שישי-שבת לאימוץ — ואז הוסיפו מודעה ראשונה.
            </p>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} />
      {label}
    </span>
  );
}
