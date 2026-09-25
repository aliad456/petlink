// צורת הנתונים שמחזירות admin_site_stats / admin_live_now (מיגרציה 20261005000001).

export type PeriodStats = {
  visitors: number;
  pageviews: number;
  members: number;
  guests: number;
  signups: number;
  businesses: number;
};

export type SiteStats = {
  periods: Record<"1" | "3" | "7" | "30", PeriodStats>;
  series: { day: string; visitors: number; signups: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_businesses: { name: string; public_id: number; views: number; visitors: number }[];
  referrers: { referrer: string; visitors: number }[];
  totals: { users: number; pets: number; businesses: number };
};

export type LiveNow = {
  total: number;
  members: number;
  guests: number;
  pages: { path: string; n: number }[];
};

export const PERIODS = [
  { key: "1", label: "היום" },
  { key: "3", label: "3 ימים" },
  { key: "7", label: "שבוע" },
  { key: "30", label: "חודש" },
] as const;
