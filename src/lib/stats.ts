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

// admin_signup_funnel(p_days) — מיגרציה 20261013000001.
export type SignupFunnel = {
  visitors: number;
  signup_visitors: number;
  signups: number;
  verified: number;
  google: number;
  with_pet: number;
  with_favorite: number;
  sources: { source: string; count: number }[];
};

// admin_site_stats_extra() — מיגרציה 20261014000001: כל הזמנים ולפי חודש.
export type SiteStatsExtra = {
  all: PeriodStats;
  since: string; // YYYY-MM-DD, היום הראשון עם פעילות
  months: (PeriodStats & { month: string })[]; // YYYY-MM, החדש ראשון
};
