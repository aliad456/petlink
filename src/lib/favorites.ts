import "server-only";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// IDs of the businesses the signed-in user saved; null when signed out
// (the heart then leads to the login page).
export async function getFavoriteIds(): Promise<string[] | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("business_id").returns<{ business_id: string }[]>();
  return (data ?? []).map((r) => r.business_id);
}
