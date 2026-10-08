// Where a sign-up came from, for the funnel in the admin dashboard
// (profiles.signup_source, admin_signup_funnel). Links to /signup pass ?src=…;
// without it the source is guessed from where the user goes afterwards.

export const SIGNUP_SOURCES = {
  favorite: "לב (שמירת עסק)",
  pet_card: "כרטיס לכלב",
  review: "כתיבת ביקורת",
  booking: "קביעת תור",
  business: "פתיחת עסק",
  header: "כפתור הרשמה למעלה",
  login: "מעמוד ההתחברות",
  meta: "מודעה בפייסבוק / אינסטגרם",
  other: "אחר",
} as const;

export type SignupSource = keyof typeof SIGNUP_SOURCES;

export function signupSource(src: unknown, next: string, accountType?: string): SignupSource {
  if (typeof src === "string" && src in SIGNUP_SOURCES) return src as SignupSource;
  if (accountType === "business_owner") return "business";
  if (next.startsWith("/save/")) return "favorite";
  if (next.startsWith("/account/pets")) return "pet_card";
  if (/^\/b\/\d+\/book/.test(next)) return "booking";
  if (/^\/b\/\d+/.test(next)) return "review";
  return "other";
}

// Ad campaigns tag their links (heykami.co.il/?utm_source=meta). SiteTracker keeps the tag
// for the visit (sessionStorage), and a sign-up during that visit is credited to the ad.
export const CAMPAIGN_KEY = "kami_campaign";

export function campaignSource(): SignupSource | null {
  try {
    const v = sessionStorage.getItem(CAMPAIGN_KEY);
    return v && v in SIGNUP_SOURCES ? (v as SignupSource) : null;
  } catch {
    return null;
  }
}

export function signupHref(next: string, src: SignupSource) {
  return `/signup?next=${encodeURIComponent(next)}&src=${src}`;
}

export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}
