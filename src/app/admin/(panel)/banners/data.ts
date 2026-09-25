import "server-only";
import { israelDate } from "@/lib/ads";
import { addDays, type Reserved, type Rules } from "@/lib/ads-calendar";
import { createClient } from "@/lib/supabase/server";

export type PlacementRow = {
  key: "home" | "category" | "search" | "popup";
  label: string;
  kind: "banner" | "popup";
  capacity: number;
  image_width: number;
  image_height: number;
  mobile_width: number | null;
  mobile_height: number | null;
  is_active: boolean;
};

export type CampaignRow = {
  id: string;
  kind: "ad" | "adoption";
  placement: PlacementRow["key"];
  advertiser: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  link_url: string | null;
  alt_text: string;
  image_path: string;
  mobile_image_path: string | null;
  status: "active" | "paused";
  notes: string | null;
  created_at: string;
  days: { day: string }[];
  stats: { day: string; impressions: number; clicks: number }[];
};

export const CAMPAIGN_COLUMNS =
  "id, kind, placement, advertiser, contact_name, contact_phone, contact_email, link_url, alt_text, image_path, mobile_image_path, status, notes, created_at, days:ad_campaign_days(day), stats:ad_stats(day, impressions, clicks)";

// Everything the calendar and forms need: placements, reserved-day rules and
// all campaigns (small table — one row per ad deal).
export async function loadAdsContext() {
  const supabase = await createClient();
  const [placements, weekdays, dates, campaigns, payments] = await Promise.all([
    supabase.from("ad_placements").select("*").order("sort_order").returns<PlacementRow[]>(),
    supabase.from("ad_weekday_rules").select("weekday, reserved_for").returns<{ weekday: number; reserved_for: Reserved }[]>(),
    supabase
      .from("ad_date_rules")
      .select("day, reserved_for, label")
      .gte("day", addDays(israelDate(), -60))
      .order("day")
      .returns<Rules["dates"][string][]>(),
    supabase.from("ad_campaigns").select(CAMPAIGN_COLUMNS).order("created_at", { ascending: false }).returns<CampaignRow[]>(),
    // RLS: only the owner gets rows here
    supabase.from("ad_payments").select("campaign_id, amount").returns<{ campaign_id: string; amount: number }[]>(),
  ]);

  const rules: Rules = {
    weekdays: Object.fromEntries((weekdays.data ?? []).map((r) => [r.weekday, r.reserved_for])),
    dates: Object.fromEntries((dates.data ?? []).map((r) => [r.day, r])),
  };
  return {
    today: israelDate(),
    placements: placements.data ?? [],
    rules,
    campaigns: campaigns.data ?? [],
    payments: Object.fromEntries((payments.data ?? []).map((p) => [p.campaign_id, Number(p.amount)])) as Record<string, number>,
  };
}

// Booked ads per placement per day (active campaigns only), for availability.
export function occupancy(campaigns: CampaignRow[], exclude?: string) {
  const map: Record<string, Record<string, { advertiser: string; kind: CampaignRow["kind"] }[]>> = {};
  for (const c of campaigns) {
    if (c.status !== "active" || c.id === exclude) continue;
    const byDay = (map[c.placement] ??= {});
    for (const { day } of c.days) (byDay[day] ??= []).push({ advertiser: c.advertiser, kind: c.kind });
  }
  return map;
}

export function totals(c: CampaignRow) {
  const impressions = c.stats.reduce((s, x) => s + Number(x.impressions), 0);
  const clicks = c.stats.reduce((s, x) => s + Number(x.clicks), 0);
  return { impressions, clicks, ctr: impressions ? (clicks / impressions) * 100 : 0 };
}

export function campaignRange(c: CampaignRow) {
  const days = c.days.map((d) => d.day).sort();
  return { first: days[0], last: days[days.length - 1], count: days.length };
}
