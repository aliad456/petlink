"use server";

import { requirePermission } from "@/lib/auth/session";
import type { LiveNow } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

// נקרא כל כמה שניות מהווידג'ט "עכשיו באתר".
export async function fetchLiveNow(): Promise<LiveNow | null> {
  await requirePermission("dashboard.view");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_live_now");
  if (error) return null;
  return data as LiveNow;
}
