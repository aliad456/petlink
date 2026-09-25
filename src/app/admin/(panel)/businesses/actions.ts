"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { requireStaff } from "@/lib/auth/session";
import type { BusinessStatus } from "@/lib/business/types";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

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
