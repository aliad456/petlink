"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { DEFAULT_LOCK_HOURS } from "@/lib/admin/lock";
import { setLoginBan } from "@/lib/auth/login-ban";
import { requireStaff } from "@/lib/auth/session";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// lockAuthor: after removing, lock the author for DEFAULT_LOCK_HOURS (community
// guidelines violation). Authorized and audited by admin_set_user_status.
export async function moderateReview(
  id: string,
  action: "keep" | "remove",
  reason?: string,
  lockAuthor = false,
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
  if (action === "keep") return { ok: "הביקורת נשארת באתר" };
  if (!lockAuthor) return { ok: "הביקורת הוסרה" };

  const { data: review } = await supabase.from("reviews").select("user_id").eq("id", id).single();
  if (!review) return { error: "הביקורת הוסרה, אבל הכותב לא נמצא לנעילה." };
  const { data: shouldBan, error: lockError } = await supabase.rpc("admin_set_user_status", {
    p_user_id: review.user_id,
    p_status: "locked",
    p_reason: `ביקורת הוסרה: ${reason!.trim()}`.slice(0, 500),
    p_hours: DEFAULT_LOCK_HOURS,
  });
  if (lockError) {
    return {
      error:
        lockError.code === "42501"
          ? "הביקורת הוסרה, אבל אין לך הרשאה לנעול את הכותב (או שזה חשבון צוות)."
          : "הביקורת הוסרה, אבל נעילת הכותב נכשלה. אפשר לנעול מכרטיס המשתמש.",
    };
  }
  if (await setLoginBan(review.user_id, Boolean(shouldBan), DEFAULT_LOCK_HOURS)) {
    return { error: "הביקורת הוסרה והכותב סומן כנעול, אבל חסימת ההתחברות נכשלה. נסו שוב מכרטיס המשתמש." };
  }
  revalidatePath(`/admin/users/${review.user_id}`);
  return { ok: `הביקורת הוסרה והכותב ננעל ל-${DEFAULT_LOCK_HOURS} שעות` };
}
