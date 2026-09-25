import { Check, Crown } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { isPermission } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import type { LiveNow, SiteStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import { LiveNowCard } from "./_stats/live-now";
import { StatsDashboard } from "./_stats/stats-dashboard";

export const metadata: Metadata = { title: "פאנל ניהול" };

type PermissionRow = { key: string; label: string; group_key: string };

export default async function AdminHomePage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const canSeeStats = staff.isOwner || staff.permissions.has("dashboard.view");
  const [{ data: catalog }, stats, live] = await Promise.all([
    supabase
      .from("permissions")
      .select("key, label, group_key")
      .order("sort_order")
      .returns<PermissionRow[]>(),
    canSeeStats ? supabase.rpc("admin_site_stats").then((r) => r.data as SiteStats | null) : null,
    canSeeStats ? supabase.rpc("admin_live_now").then((r) => r.data as LiveNow | null) : null,
  ]);

  const mine = (catalog ?? []).filter(
    (p) => staff.isOwner || (isPermission(p.key) && staff.permissions.has(p.key)),
  );

  return (
    <PageTransition>
      <div className="flex max-w-5xl flex-col gap-6">
        <header className="animate-rise flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            שלום {staff.profile.full_name || staff.profile.email}
          </h1>
          {staff.isOwner && (
            <Badge tone="brand" className="self-start">
              <Crown className="size-3.5" />
              בעלים — גישה מלאה
            </Badge>
          )}
        </header>
        {canSeeStats && (
          <div className="animate-rise flex flex-col gap-4" style={{ "--i": 1 } as CSSProperties}>
            <LiveNowCard initial={live} />
            {stats && <StatsDashboard stats={stats} />}
          </div>
        )}
        <Card className="animate-rise" style={{ "--i": 2 } as CSSProperties}>
          <details open={!canSeeStats} className="group flex flex-col gap-4">
          <summary className="cursor-pointer list-none">
            <SectionTitle className="inline">{staff.isOwner ? "כל ההרשאות" : "ההרשאות שלך"}</SectionTitle>
            <span className="ms-2 text-xs text-muted group-open:hidden">(הצגה)</span>
          </summary>
          {staff.isOwner && (
            <p className="mt-4 text-sm text-muted">
              כולל פעולות שרק הבעלים יכול לבצע: מחיקה לצמיתות, ניהול מנהלים והרשאות,
              וצפייה בהכנסות.
            </p>
          )}
          <ul className="mt-4 grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-2">
            {mine.map((p) => (
              <li key={p.key} className="flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-brand">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>
          </details>
        </Card>
      </div>
    </PageTransition>
  );
}
