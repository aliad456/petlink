import { NextResponse } from "next/server";
import { dayKey } from "@/lib/bookings";
import { pushBookingReminder, REMINDER_COLUMNS, type ReminderRow } from "@/lib/push/bookings";
import { createAdminClient } from "@/lib/supabase/admin";

// Daily (vercel.json → crons): reminds customers of tomorrow's appointments.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else gets a 401.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Tomorrow in Israel, with a day of slack on each side; filtered exactly below.
  const now = Date.now();
  const tomorrow = dayKey(new Date(now + 86_400_000));
  const { data, error } = await createAdminClient()
    .from("bookings")
    .select(REMINDER_COLUMNS)
    .eq("status", "booked")
    .gte("starts_at", new Date(now).toISOString())
    .lt("starts_at", new Date(now + 3 * 86_400_000).toISOString())
    .returns<ReminderRow[]>();
  if (error) return NextResponse.json({ error: "query failed" }, { status: 500 });
  const due = (data ?? []).filter((b) => dayKey(b.starts_at) === tomorrow);
  await Promise.all(due.map(pushBookingReminder));
  return NextResponse.json({ sent: due.length });
}
