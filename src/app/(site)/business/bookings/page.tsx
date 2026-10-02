import { CalendarClock, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, Card, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { dayKey, nowMs, relativeDayLabel, type BookingSettings } from "@/lib/bookings";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { BookingCard, type BusinessBooking } from "./booking-card";
import { MarkSeen } from "./mark-seen";

export const metadata: Metadata = { title: "תורים", robots: { index: false } };

const DAY = 86_400_000;

export default async function BusinessBookingsPage() {
  await requireUser();
  const business = await getOwnBusiness();
  const supabase = await createClient();
  const now = nowMs();
  const [{ data: rows }, { data: settings }] = business
    ? await Promise.all([
        supabase.rpc("business_bookings", {
          p_from: new Date(now - 14 * DAY).toISOString(),
          p_to: new Date(now + 120 * DAY).toISOString(),
        }),
        supabase.from("booking_settings").select("enabled").eq("business_id", business.id).maybeSingle<Pick<BookingSettings, "enabled">>(),
      ])
    : [{ data: null }, { data: null }];
  const all = (rows as BusinessBooking[] | null) ?? [];
  // Still running (ended less than an hour ago) counts as upcoming.
  const upcoming = all.filter((b) => new Date(b.ends_at).getTime() > now - 3_600_000);
  const past = all.filter((b) => !upcoming.includes(b)).reverse();
  const days = new Map<string, BusinessBooking[]>();
  for (const b of upcoming) days.set(dayKey(b.starts_at), [...(days.get(dayKey(b.starts_at)) ?? []), b]);
  const hasNew = all.some((b) => !b.seen_at);

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight">
              <CalendarClock className="size-7 text-brand" />
              תורים
            </h1>
            <p className="text-muted">מי קבע, מתי, ועם איזו חיה.</p>
          </div>
          {business && (
            <Link href="/business/bookings/settings" transitionTypes={["nav-forward"]} className={buttonClass({ variant: "glass", size: "sm" })}>
              <Settings className="size-4" />
              הגדרות
            </Link>
          )}
        </header>
        {hasNew && <MarkSeen />}

        {!business ? (
          <Card className="py-10 text-center text-muted">הדף הזה לבעלי עסקים ב-Kami.</Card>
        ) : (
          <>
            {!settings?.enabled && (
              <Card className="flex flex-col items-center gap-3 p-6 text-center">
                <p className="font-semibold">קבלת תורים אונליין כבויה</p>
                <p className="max-w-sm text-sm text-muted">מוסיפים שירותים ומפעילים, ובעמוד העסק יופיע כפתור ״קביעת תור״.</p>
                <Link href="/business/bookings/settings" transitionTypes={["nav-forward"]} className={buttonClass({ size: "sm" })}>
                  להגדרות התורים
                </Link>
              </Card>
            )}

            {upcoming.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 py-12 text-center">
                <CalendarClock className="size-10 text-muted" />
                <p className="font-semibold">אין תורים קרובים</p>
                {settings?.enabled && <p className="text-sm text-muted">כשלקוח יקבע תור הוא יופיע כאן מיד.</p>}
              </Card>
            ) : (
              [...days].map(([key, list], i) => (
                <section key={key} className="animate-rise flex flex-col gap-2" style={{ "--i": i } as CSSProperties}>
                  <SectionTitle>{relativeDayLabel(list[0].starts_at)}</SectionTitle>
                  <ul className="flex flex-col gap-2">
                    {list.map((b) => (
                      <BookingCard key={b.id} booking={b} />
                    ))}
                  </ul>
                </section>
              ))
            )}

            {past.length > 0 && (
              <details className="glass-lite rounded-[1.5rem] p-4">
                <summary className="cursor-pointer font-semibold">תורים שעברו (שבועיים אחרונים)</summary>
                <ul className="mt-3 flex flex-col gap-2">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} past />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </main>
    </PageTransition>
  );
}
