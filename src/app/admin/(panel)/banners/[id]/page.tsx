import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";
import { shortDate } from "@/lib/ads-calendar";
import { requireStaff } from "@/lib/auth/session";
import { isUuid } from "@/lib/uuid";
import { CampaignForm } from "../campaign-form";
import { campaignRange, loadAdsContext, occupancy, totals } from "../data";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "מודעה" };

export default async function CampaignPage({ params }: PageProps<"/admin/banners/[id]">) {
  const staff = await requireStaff();
  const can = (p: "banners.manage" | "banners.reports") => staff.isOwner || staff.permissions.has(p);
  if (!can("banners.manage") && !can("banners.reports")) notFound();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const ctx = await loadAdsContext();
  const c = ctx.campaigns.find((x) => x.id === id);
  if (!c) notFound();
  const placement = ctx.placements.find((p) => p.key === c.placement);
  const t = totals(c);
  const r = campaignRange(c);
  const byDay = new Map(c.stats.map((s) => [s.day, s]));

  return (
    <PageTransition>
      <div className="flex max-w-3xl flex-col gap-6">
        <header className="print:hidden">
          <Link href="/admin/banners" className="text-sm text-muted hover:text-foreground">
            ← מודעות
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{c.advertiser}</h1>
        </header>

        {/* דוח למפרסם */}
        <Card className="flex flex-col gap-4 p-5 print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">דוח {c.kind === "adoption" ? "יום אימוץ" : "מודעה"} — {c.advertiser}</h2>
              <p className="text-sm text-muted">
                {placement?.label} · {r.first ? `${shortDate(r.first)}–${shortDate(r.last)} · ${r.count} ימים` : ""}
              </p>
            </div>
            <span className="print:hidden">
              <PrintButton />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="חשיפות" value={t.impressions.toLocaleString("he-IL")} />
            <Stat label="לחיצות" value={t.clicks.toLocaleString("he-IL")} />
            <Stat label="אחוז הקלקה" value={`${t.ctr.toFixed(1)}%`} />
          </div>
          {c.days.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-2xl border border-[var(--border)] print:max-h-none">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--glass-bg-strong)] text-muted">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">יום</th>
                    <th className="px-3 py-2 text-end font-semibold">חשיפות</th>
                    <th className="px-3 py-2 text-end font-semibold">לחיצות</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {c.days
                    .map((d) => d.day)
                    .sort()
                    .map((d) => {
                      const s = byDay.get(d);
                      return (
                        <tr key={d} className="border-t border-[var(--border)]">
                          <td className="px-3 py-1.5">{shortDate(d)}</td>
                          <td className="px-3 py-1.5 text-end">{Number(s?.impressions ?? 0).toLocaleString("he-IL")}</td>
                          <td className="px-3 py-1.5 text-end">{Number(s?.clicks ?? 0).toLocaleString("he-IL")}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted">
            חשיפה = המודעה הוצגה על המסך (פעם אחת לכל גולש ביום). לחיצה = כניסה לקישור של המפרסם.
          </p>
        </Card>

        {can("banners.manage") && (
          <div className="print:hidden">
            <CampaignForm
              id={c.id}
              initial={{
                kind: c.kind,
                placement: c.placement,
                advertiser: c.advertiser,
                contact_name: c.contact_name ?? "",
                contact_phone: c.contact_phone ?? "",
                contact_email: c.contact_email ?? "",
                link_url: c.link_url ?? "",
                alt_text: c.alt_text,
                image_path: c.image_path,
                mobile_image_path: c.mobile_image_path ?? "",
                status: c.status,
                notes: c.notes ?? "",
              }}
              initialDays={c.days.map((d) => d.day)}
              initialPrice={ctx.payments[c.id] ?? null}
              placements={ctx.placements}
              rules={ctx.rules}
              booked={occupancy(ctx.campaigns, c.id)}
              today={ctx.today}
              isOwner={staff.isOwner}
            />
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--glass-bg)] px-3 py-4">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
