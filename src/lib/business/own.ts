import "server-only";
import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_COLUMNS, type BusinessRow } from "./load";

// The signed-in owner's business (one per owner for now), or null.
export const getOwnBusiness = cache(async (): Promise<BusinessRow | null> => {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select(BUSINESS_COLUMNS)
    .eq("owner_id", profile.id)
    .order("created_at")
    .limit(1)
    .maybeSingle<BusinessRow>();
  return data;
});
