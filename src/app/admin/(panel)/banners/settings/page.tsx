import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { Card, SectionTitle } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { loadAdsContext } from "../data";
import { DateRules, PlacementSettings, WeekdayRules } from "./settings-forms";

export const metadata: Metadata = { title: "ימים שמורים והגדרות" };

export default async function AdSettingsPage() {
  await requirePermission("banners.manage");
  const ctx = await loadAdsContext();

  return (
    <PageTransition>
      <div className="flex max-w-3xl flex-col gap-5">
        <header>
          <Link href="/admin/banners" className="text-sm text-muted hover:text-foreground">
            ← מודעות
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">ימים שמורים והגדרות</h1>
          <p className="mt-1 text-muted">
            יום שמור לאימוץ = מודעות רגילות לא נכנסות אליו בלי אישור שלך (ולהפך). תאריך מיוחד גובר על החוק הקבוע.
          </p>
        </header>

        <Card className="flex flex-col gap-4">
          <SectionTitle>חוק קבוע לפי יום בשבוע</SectionTitle>
          <WeekdayRules initial={ctx.rules.weekdays} />
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionTitle>תאריכים מיוחדים (חגים, אירועים)</SectionTitle>
          <DateRules initial={Object.values(ctx.rules.dates)} today={ctx.today} />
        </Card>

        <Card className="flex flex-col gap-4">
          <SectionTitle>מיקומים באתר</SectionTitle>
          <PlacementSettings placements={ctx.placements} />
        </Card>
      </div>
    </PageTransition>
  );
}
