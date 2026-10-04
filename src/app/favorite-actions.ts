"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Save / unsave a business. RLS limits rows to the user's own, and only
// public businesses can be saved.
// Signed out (e.g. a page loaded before signing out): `signedOut` lets the heart
// show its sign-up prompt instead of failing.
export async function toggleFavorite(
  businessId: string,
  on: boolean,
): Promise<{ error?: string; signedOut?: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { signedOut: true };
  if (!isUuid(businessId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("favorites").upsert({ user_id: profile.id, business_id: businessId }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", profile.id).eq("business_id", businessId);
  if (error) return { error: "השמירה נכשלה. נסו שוב." };
  revalidatePath("/account");
  return {};
}
