import { ArrowRight, CalendarClock, Gem } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { DEFAULT_SETTINGS, SERVICE_COLUMNS, SETTINGS_COLUMNS, type BookingService, type BookingSettings } from "@/lib/bookings";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { SettingsEditor } from "./settings-editor";

export const metadata: Metadata = { title: "הגדרות תורים", robots: { index: false } };

export default async function BookingSettingsPage() {
  await requireUser();
  const business = await getOwnBusiness();
  const supabase = await createClient();
  const [{ data: settings }, { data: services }] = business
    ? await Promise.all([
        supabase.from("booking_settings").select(SETTINGS_COLUMNS).eq("business_id", business.id).maybeSingle<BookingSettings>(),
        supabase
          .from("booking_services")
          .select(SERVICE_COLUMNS)
          .eq("business_id", business.id)
          .order("sort_order")
          .order("created_at")
          .returns<BookingService[]>(),
      ])
    : [{ data: null }, { data: null }];
  const pro = business?.plan === "pro";
  const hasHours = !!business && Object.values(business.hours ?? {}).some((r) => Array.isArray(r) && r.length > 0);

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-8">
        <Link
          href="/business/bookings"
          transitionTypes={["nav-back"]}
          className="focus-ring inline-flex items-center gap-1.5 self-start rounded-lg text-sm text-muted hover:text-foreground"
        >
          <ArrowRight className="size-4" />
          לתורים
        </Link>
        <header className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
            <CalendarClock className="size-7 text-brand" />
            הגדרות תורים
          </h1>
          <p className="text-muted">השירותים שלקוחות יכולים להזמין, מתי, ומה מדיניות הביטול.</p>
        </header>

        {!business ? (
          <Card className="py-10 text-center text-muted">הדף הזה לבעלי עסקים ב-Kami.</Card>
        ) : (
          <>
            {!pro && (
              <Card className="flex flex-col items-center gap-3 p-7 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-kami text-white">
                  <Gem className="size-6" />
                </span>
                <p className="text-lg font-bold">זימון תורים אונליין זמין במנוי KamiPet ומעלה</p>
                <p className="max-w-sm text-sm text-muted">
                  לקוחות קובעים תור ישר מהעמוד שלכם ב-Kami, בלי טלפונים. אפשר כבר להכין את השירותים, והם יופיעו בעמוד
                  כשהמנוי יהיה פעיל.
                </p>
                <Link href="/plans" className={buttonClass({ size: "sm" })}>
                  לתוכניות
                </Link>
              </Card>
            )}
            <SettingsEditor
              pro={pro}
              hasHours={hasHours}
              settings={{ ...DEFAULT_SETTINGS, ...(settings ?? {}), business_id: business.id }}
              services={services ?? []}
            />
          </>
        )}
      </main>
    </PageTransition>
  );
}
