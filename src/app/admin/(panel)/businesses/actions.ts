"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { requireStaff } from "@/lib/auth/session";
import type { BusinessStatus } from "@/lib/business/types";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { z } from "zod";

export type Result = { ok?: string; error?: string };

function dbError(error: PostgrestError): Result {
  if (error.code === "42501") return { error: "אין לך הרשאה לפעולה הזו." };
  if (error.code === "22023") return { error: "צריך לכתוב סיבה." };
  if (error.code === "P0002") return { error: "העסק לא נמצא." };
  return { error: "הפעולה נכשלה. נסו שוב." };
}

const MESSAGES: Partial<Record<BusinessStatus, string>> = {
  approved: "העסק אושר ועלה לאוויר",
  suspended: "העסק הושהה",
  draft: "העסק הוחזר לעריכה",
  removed: "העסק הוסר",
};

export async function setBusinessStatus(id: string, status: BusinessStatus, reason?: string): Promise<Result> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_business_status", {
    p_id: id,
    p_status: status,
    p_reason: reason?.trim() || null,
  });
  if (error) return dbError(error);
  revalidateTag(BUSINESSES_TAG, { expire: 0 });
  revalidatePath("/admin/businesses");
  return { ok: MESSAGES[status] };
}

export async function setBusinessFeatured(id: string, featured: boolean): Promise<Result> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_business_featured", { p_id: id, p_featured: featured });
  if (error) return dbError(error);
  revalidateTag(BUSINESSES_TAG, { expire: 0 });
  revalidatePath("/admin/businesses");
  return { ok: featured ? "סומן כמומלץ" : "הוסר מהמומלצים" };
}

// ─── עמודים לא מנוהלים (נוצרים ע"י הצוות ממידע ציבורי) ─────────

const phone = z
  .string()
  .trim()
  .regex(/^(\+972|0)[\d\s-]{8,13}$/, "מספר טלפון לא תקין")
  .or(z.literal(""));

const unclaimedSchema = z.object({
  id: z.string().refine((v) => v === "" || isUuid(v)),
  name: z.string().trim().min(2, "שם העסק קצר מדי").max(60, "שם העסק ארוך מדי"),
  category_id: z.string().refine(isUuid, "בחרו קטגוריה"),
  city: z.string().trim().min(2, "בחרו עיר").max(60),
  address: z.string().trim().max(120),
  phone,
  whatsapp: phone,
  website: z.string().trim().max(200),
  bio: z.string().trim().max(1500),
});

export type UnclaimedState = Result & { fields?: Record<string, string> };

export async function saveUnclaimedBusiness(_: UnclaimedState, formData: FormData): Promise<UnclaimedState> {
  await requireStaff();
  const fields = Object.fromEntries(
    ["id", "name", "category_id", "city", "address", "phone", "whatsapp", "website", "bio"].map((k) => [
      k,
      String(formData.get(k) ?? ""),
    ]),
  );
  const parsed = unclaimedSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_save_unclaimed_business", {
    p_id: d.id || null,
    p_name: d.name,
    p_category: d.category_id,
    p_city: d.city,
    p_address: d.address,
    p_phone: d.phone,
    p_whatsapp: d.whatsapp,
    p_website: d.website,
    p_bio: d.bio,
    p_hours: null,
  });
  if (error) {
    if (error.hint === "profanity") return { error: "נמצאה מילה לא מתאימה באחד השדות.", fields };
    if (error.code === "P0002") return { error: "העמוד כבר שויך לבעלים ואי אפשר לערוך אותו מכאן.", fields };
    return { ...dbError(error), fields };
  }
  revalidateTag(BUSINESSES_TAG, { expire: 0 });
  revalidatePath("/admin/businesses");
  return { ok: d.id ? "העמוד עודכן" : "העמוד נוצר ועלה לאוויר" };
}

// ─── בקשות בעלות / הסרה ─────────────────────────────────────

export async function reviewClaim(id: string, approve: boolean, note?: string): Promise<Result> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_claim", {
    p_claim: id,
    p_approve: approve,
    p_note: note?.trim() || null,
  });
  if (error) {
    if (error.code === "22023") return { error: error.message.includes("already owns") ? "למבקש כבר יש עסק אחר." : "העמוד כבר שויך לבעלים." };
    return dbError(error);
  }
  revalidateTag(BUSINESSES_TAG, { expire: 0 });
  revalidatePath("/admin/claims");
  revalidatePath("/admin/businesses");
  return { ok: approve ? "הבקשה אושרה" : "הבקשה נדחתה" };
}
