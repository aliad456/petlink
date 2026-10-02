import "server-only";
import { relativeDayLabel, timeLabel } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "./send";

// Booking notifications. Called (through after()) once the booking RPC has
// succeeded, so the caller is already authorized for this booking.

type Row = {
  id: string;
  starts_at: string;
  service_name: string;
  pet_name: string | null;
  cancel_reason: string | null;
  customer_id: string;
  customer: { full_name: string } | null;
  business: { name: string; owner_id: string | null } | null;
};

async function load(id: string) {
  const { data } = await createAdminClient()
    .from("bookings")
    .select(
      "id, starts_at, service_name, pet_name, cancel_reason, customer_id, customer:profiles!bookings_customer_id_fkey(full_name), business:businesses(name, owner_id)",
    )
    .eq("id", id)
    .maybeSingle<Row>();
  return data;
}

const when = (b: Row) => `${relativeDayLabel(b.starts_at)} ב-${timeLabel(b.starts_at)}`;
const firstName = (b: Row) => b.customer?.full_name.trim().split(/\s+/)[0] || "לקוח/ה";

/** To the business: someone booked. */
export async function pushBookingCreated(id: string) {
  const b = await load(id);
  if (!b?.business?.owner_id) return;
  await notifyUser(b.business.owner_id, {
    title: "נקבע אליך תור חדש 📅",
    body: `${firstName(b)}${b.pet_name ? ` עם ${b.pet_name}` : ""} · ${b.service_name} · ${when(b)}`,
    url: "/business/bookings",
    tag: `booking-${b.id}`,
  });
}

/** To the other side: the customer or the business cancelled. */
export async function pushBookingCancelled(id: string, by: "customer" | "business") {
  const b = await load(id);
  if (!b?.business) return;
  if (by === "customer") {
    if (!b.business.owner_id) return;
    await notifyUser(b.business.owner_id, {
      title: "תור בוטל",
      body: `${firstName(b)} ביטל/ה: ${b.service_name} · ${when(b)}. השעה פנויה שוב.`,
      url: "/business/bookings",
      tag: `booking-${b.id}`,
    });
  } else {
    await notifyUser(b.customer_id, {
      title: `${b.business.name} ביטל/ה את התור`,
      body: `${b.service_name} · ${when(b)}${b.cancel_reason ? `. ${b.cancel_reason}` : ""}`,
      url: "/account#bookings",
      tag: `booking-${b.id}`,
    });
  }
}

/** To the customer: the business moved the appointment. */
export async function pushBookingMoved(id: string) {
  const b = await load(id);
  if (!b?.business) return;
  await notifyUser(b.customer_id, {
    title: `${b.business.name} הזיז/ה את התור`,
    body: `${b.service_name} · עכשיו ${when(b)}`,
    url: "/account#bookings",
    tag: `booking-${b.id}`,
  });
}

/** To the customer, the day before (from the daily cron). */
export async function pushBookingReminder(b: Row) {
  if (!b.business) return;
  await notifyUser(b.customer_id, {
    title: `תזכורת: התור שלך מחר ב-${timeLabel(b.starts_at)} 🐾`,
    body: `${b.service_name} ב${b.business.name}${b.pet_name ? ` עם ${b.pet_name}` : ""}. לא מגיעים? אפשר לבטל באתר.`,
    url: "/account#bookings",
    tag: `reminder-${b.id}`,
  });
}

export type ReminderRow = Row;
export const REMINDER_COLUMNS =
  "id, starts_at, service_name, pet_name, cancel_reason, customer_id, customer:profiles!bookings_customer_id_fkey(full_name), business:businesses(name, owner_id)";
