import "server-only";
import { unstable_cache } from "next/cache";
import { israelDate } from "@/lib/ads";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { createPublicClient } from "@/lib/supabase/public";

export type Deal = {
  id: string;
  public_id: number;
  name: string;
  city: string | null;
  avatar_path: string | null;
  deal_text: string;
  deal_until: string;
  category: { name: string; icon: string | null } | null;
};

// Running deals ("מבצעים השבוע"): same for everyone, cached briefly and per day.
const load = unstable_cache(
  async (day: string, limit: number) => {
    const { data, error } = await createPublicClient()
      .from("businesses")
      .select("id, public_id, name, city, avatar_path, deal_text, deal_until, category:categories(name, icon)")
      .not("deal_text", "is", null)
      .gte("deal_until", day)
      .order("deal_until")
      .limit(limit)
      .returns<Deal[]>();
    if (error) throw error;
    return data ?? [];
  },
  ["deals-v1"],
  { tags: [BUSINESSES_TAG], revalidate: 300 },
);

export async function getDeals(limit = 12): Promise<Deal[]> {
  try {
    return await load(israelDate(), limit);
  } catch {
    return [];
  }
}
