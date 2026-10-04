import { NextResponse } from "next/server";
import { dayKey } from "@/lib/bookings";
import { emailLayout, sendEmail } from "@/lib/email/send";
import { notifyUser } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";

// Daily (vercel.json → crons): reminds pet owners of upcoming vaccines, a week and a
// day before pet_vaccines.next_due, by push and email. due_vaccine_reminders() picks
// who (and skips anyone who turned reminders off); vaccine_reminders_sent stops repeats.
// Vercel sends "Authorization: Bearer $CRON_SECRET"; anything else gets a 401.
export const maxDuration = 60;

type Due = {
  vaccine_id: string;
  due_on: string;
  kind: "week" | "day";
  vaccine_name: string;
  pet_id: string;
  pet_name: string;
  user_id: string;
  email: string | null;
  full_name: string;
};

function when(days: number) {
  if (days <= 0) return "היום";
  if (days === 1) return "מחר";
  return `בעוד ${days} ימים`;
}

async function remind(r: Due, today: string) {
  const days = Math.round((Date.parse(r.due_on) - Date.parse(today)) / 86_400_000);
  const site = siteUrl();
  const url = `/account/pets/${r.pet_id}`;
  const title = `${when(days)}: ${r.vaccine_name} ל${r.pet_name}`;
  const body = days <= 1 ? "זה הזמן לקבוע תור לווטרינר, אם עוד לא קבעתם." : "יש עוד זמן לקבוע תור לווטרינר בנוחות.";
  await Promise.all([
    notifyUser(r.user_id, { title, body, url, tag: `vaccine-${r.vaccine_id}` }),
    r.email &&
      sendEmail({
        to: r.email,
        subject: `🐾 ${title}`,
        text: `${title}\n${body}\nלכרטיס של ${r.pet_name}: ${site}${url}\nאפשר לכבות תזכורות בעמוד החשבון: ${site}/account`,
        html: emailLayout({
          siteUrl: site,
          title,
          lines: [
            `${r.full_name ? `${r.full_name.split(" ")[0]}, ` : ""}לפי הכרטיס של ${r.pet_name}, החיסון "${r.vaccine_name}" מתוכנן ל-${r.due_on.split("-").reverse().join(".")}.`,
            body,
          ],
          button: { label: `לכרטיס של ${r.pet_name}`, url: `${site}${url}` },
          footer: "קיבלת את המייל כי הוספת תאריך לחיסון הבא ב-Kami. אפשר לכבות תזכורות בעמוד החשבון.",
        }),
      }),
  ]);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const today = dayKey(new Date());
  const db = createAdminClient();
  const { data, error } = await db.rpc("due_vaccine_reminders", { p_today: today });
  if (error) return NextResponse.json({ error: "query failed" }, { status: 500 });
  const due = (data ?? []) as Due[];

  // A few at a time, and each one marked as sent right after it goes out.
  for (let i = 0; i < due.length; i += 10) {
    const batch = due.slice(i, i + 10);
    await Promise.all(batch.map((r) => remind(r, today)));
    await db
      .from("vaccine_reminders_sent")
      .upsert(batch.map((r) => ({ vaccine_id: r.vaccine_id, due_on: r.due_on, kind: r.kind })), { ignoreDuplicates: true });
  }
  return NextResponse.json({ sent: due.length });
}
