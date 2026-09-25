"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export async function moderateReview(
  id: string,
  action: "keep" | "remove",
  reason?: string,
): Promise<{ ok?: string; error?: string }> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  if (action === "remove" && !reason?.trim()) return { error: "צריך לכתוב סיבה" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_review", {
    p_review: id,
    p_action: action,
    p_reason: reason?.trim() || null,
  });
  if (error) return { error: error.code === "42501" ? "אין לך הרשאה לפעולה הזו." : "הפעולה נכשלה. נסו שוב." };
  revalidateTag(BUSINESSES_TAG, { expire: 0 });
  revalidatePath("/admin/reviews");
  return { ok: action === "keep" ? "הביקורת נשארת באתר" : "הביקורת הוסרה" };
}
