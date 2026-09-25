import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// Ads running today in a placement. The same for every visitor, so cached
// briefly; the Israeli date is part of the key so a new day starts fresh.
// Admin changes call revalidateTag(ADS_TAG).

export const ADS_TAG = "ads";

export type Placement = "home" | "category" | "search" | "popup";

export type ActiveAd = {
  id: string;
  kind: "ad" | "adoption";
  advertiser: string;
  alt_text: string;
  image_path: string;
  mobile_image_path: string | null;
  has_link: boolean;
  width: number;
  height: number;
  mobile_width: number | null;
  mobile_height: number | null;
};

export type AdPreview = Omit<ActiveAd, "has_link"> & {
  placement: Placement;
  first_day: string | null;
  last_day: string | null;
  day_count: number;
};

export function israelDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(d); // YYYY-MM-DD
}

const load = unstable_cache(
  // `day` only varies the cache key.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (placement: Placement, day: string) => {
    const { data, error } = await createPublicClient().rpc("active_ads", { p_placement: placement });
    if (error) throw error;
    return (data ?? []) as ActiveAd[];
  },
  ["active-ads-v1"],
  { tags: [ADS_TAG], revalidate: 300 },
);

// Never lets an ad problem break the page.
export async function getActiveAds(placement: Placement): Promise<ActiveAd[]> {
  try {
    return await load(placement, israelDate());
  } catch {
    return [];
  }
}

// Shared preview link for an advertiser (not cached: rare, and must be fresh).
export async function getAdPreview(token: string): Promise<AdPreview | null> {
  const { data } = await createPublicClient().rpc("ad_preview", { p_token: token });
  return ((data ?? []) as AdPreview[])[0] ?? null;
}
