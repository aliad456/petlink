"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { bookingError, DAYS_AHEAD, israelLocalToISO, NOTICE_OPTIONS, SLOT_STEPS } from "@/lib/bookings";
import { getOwnBusiness } from "@/lib/business/own";
import { pushBookingCancelled, pushBookingMoved } from "@/lib/push/bookings";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

type Result = { error?: string };

async function ownBusiness() {
  await requireUser();
  return getOwnBusiness();
}

function refresh(publicId: number) {
  revalidatePath("/business/bookings", "layout");
  revalidatePath(`/b/${publicId}`, "layout");
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  slot_step_min: z.number().refine((n) => (SLOT_STEPS as readonly number[]).includes(n)),
  min_notice_min: z.number().refine((n) => NOTICE_OPTIONS.some((o) => o.value === n)),
  max_days_ahead: z.number().refine((n) => (DAYS_AHEAD as readonly number[]).includes(n)),
  cancel_policy: z.string().trim().max(800, "מדיניות הביטול ארוכה מדי (עד 800 תווים)"),
});

export async function saveBookingSettings(input: z.input<typeof settingsSchema>): Promise<Result> {
  const business = await ownBusiness();
  if (!business) return { error: "לא נמצא עסק" };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.enabled && business.plan !== "pro") return { error: bookingError({ message: "pro required" }) };
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_settings")
    .upsert({ business_id: business.id, ...parsed.data, cancel_policy: parsed.data.cancel_policy || null });
  if (error) return { error: bookingError(error, "השמירה נכשלה. נסו שוב.") };
  refresh(business.public_id);
  return {};
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "שם השירות קצר מדי").max(60, "שם השירות ארוך מדי"),
  duration_min: z.number().int().min(10).max(480).refine((n) => n % 5 === 0),
  price: z.string().trim().max(30),
  note: z.string().trim().max(160),
  active: z.boolean(),
});

export async function saveService(input: z.input<typeof serviceSchema>): Promise<Result> {
  const business = await ownBusiness();
  if (!business) return { error: "לא נמצא עסק" };
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;
  const row = { ...rest, price: rest.price || null, note: rest.note || null };
  const supabase = await createClient();
  const { error } =
    id && isUuid(id)
      ? await supabase.from("booking_services").update(row).eq("id", id).eq("business_id", business.id)
      : await supabase.from("booking_services").insert({ ...row, business_id: business.id });
  if (error) return { error: bookingError(error, "השמירה נכשלה. נסו שוב.") };
  refresh(business.public_id);
  return {};
}

export async function deleteService(id: string): Promise<Result> {
  const business = await ownBusiness();
  if (!business || !isUuid(id)) return { error: "לא נמצא" };
  const supabase = await createClient();
  const { error } = await supabase.from("booking_services").delete().eq("id", id).eq("business_id", business.id);
  if (error) return { error: "המחיקה נכשלה. נסו שוב." };
  refresh(business.public_id);
  return {};
}

export async function cancelBookingAsBusiness(id: string, reason: string): Promise<Result> {
  const business = await ownBusiness();
  if (!business || !isUuid(id)) return { error: "לא נמצא" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_id: id, p_reason: reason.slice(0, 200) });
  if (error) return { error: bookingError(error) };
  after(() => pushBookingCancelled(id, "business"));
  refresh(business.public_id);
  return {};
}

export async function moveBooking(id: string, local: string): Promise<Result> {
  const business = await ownBusiness();
  const startsAt = israelLocalToISO(local);
  if (!business || !isUuid(id) || !startsAt) return { error: "בחרו יום ושעה" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_booking", { p_id: id, p_starts_at: startsAt });
  if (error) return { error: bookingError(error) };
  after(() => pushBookingMoved(id));
  refresh(business.public_id);
  return {};
}

export async function markBookingsSeen(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("mark_bookings_seen");
}
