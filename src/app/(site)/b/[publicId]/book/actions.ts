"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { bookingError } from "@/lib/bookings";
import { pushBookingCancelled, pushBookingCreated } from "@/lib/push/bookings";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

/** Free start times (ISO) for a service on one Israel calendar day. */
export async function getSlots(businessId: string, serviceId: string, day: string): Promise<string[]> {
  if (!isUuid(businessId) || !isUuid(serviceId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("booking_slots", { p_business: businessId, p_service: serviceId, p_day: day });
  return ((data as string[] | null) ?? []).map((s) => new Date(s).toISOString());
}

const bookSchema = z.object({
  businessId: z.string().refine(isUuid),
  serviceId: z.string().refine(isUuid),
  startsAt: z.string().datetime({ offset: true }),
  petId: z.string().refine(isUuid).nullable(),
  sharePet: z.boolean(),
  note: z.string().trim().max(300, "ההערה ארוכה מדי"),
  policyOk: z.boolean(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+972|0)[\d\s-]{8,13}$/, "מספר טלפון לא תקין")
    .or(z.literal("")),
});

export async function bookAppointment(input: z.input<typeof bookSchema>): Promise<{ error?: string; id?: string }> {
  const profile = await requireUser();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const supabase = await createClient();
  // The business needs a way to reach the customer.
  if (!profile.phone?.trim()) {
    if (!d.phone) return { error: bookingError({ message: "phone_required" }) };
    const { error } = await supabase.from("profiles").update({ phone: d.phone }).eq("id", profile.id);
    if (error) return { error: "שמירת הטלפון נכשלה. נסו שוב." };
  }
  const { data, error } = await supabase.rpc("book_appointment", {
    p_business: d.businessId,
    p_service: d.serviceId,
    p_starts_at: d.startsAt,
    p_pet: d.petId,
    p_share_pet: d.sharePet && !!d.petId,
    p_note: d.note || null,
    p_policy_ok: d.policyOk,
  });
  if (error) return { error: bookingError(error) };
  after(() => pushBookingCreated(data as string));
  revalidatePath("/account");
  return { id: data as string };
}

export async function cancelMyBooking(id: string): Promise<{ error?: string }> {
  await requireUser();
  if (!isUuid(id)) return { error: "לא נמצא" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_id: id, p_reason: null });
  if (error) return { error: bookingError(error) };
  after(() => pushBookingCancelled(id, "customer"));
  revalidatePath("/account");
  return {};
}
