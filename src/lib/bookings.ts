// Appointment booking (KamiPet plans and up, i.e. businesses.plan = 'pro').
// Rules live in the database (supabase/migrations/20261011000001_bookings.sql):
// slots come from the business's opening hours, a booking is confirmed at once,
// and every change goes through an RPC. This file holds shared types and labels.

const TZ = "Asia/Jerusalem";

export type BookingStatus = "booked" | "cancelled_by_customer" | "cancelled_by_business";

export type BookingSettings = {
  business_id: string;
  enabled: boolean;
  slot_step_min: number;
  min_notice_min: number;
  max_days_ahead: number;
  cancel_policy: string | null;
};

export type BookingService = {
  id: string;
  business_id: string;
  name: string;
  duration_min: number;
  price: string | null;
  note: string | null;
  sort_order: number;
  active: boolean;
};

export const SERVICE_COLUMNS = "id, business_id, name, duration_min, price, note, sort_order, active";
export const SETTINGS_COLUMNS = "business_id, enabled, slot_step_min, min_notice_min, max_days_ahead, cancel_policy";

export const DEFAULT_SETTINGS: Omit<BookingSettings, "business_id"> = {
  enabled: false,
  slot_step_min: 30,
  min_notice_min: 120,
  max_days_ahead: 30,
  cancel_policy: null,
};

export const SLOT_STEPS = [10, 15, 20, 30, 45, 60] as const;
export const NOTICE_OPTIONS = [
  { value: 0, label: "בלי הגבלה" },
  { value: 60, label: "שעה לפני" },
  { value: 120, label: "שעתיים לפני" },
  { value: 240, label: "4 שעות לפני" },
  { value: 720, label: "12 שעות לפני" },
  { value: 1440, label: "יום לפני" },
  { value: 2880, label: "יומיים לפני" },
] as const;
export const DAYS_AHEAD = [7, 14, 30, 60, 90] as const;

export const STATUS_LABEL: Record<BookingStatus, string> = {
  booked: "נקבע",
  cancelled_by_customer: "בוטל ע״י הלקוח",
  cancelled_by_business: "בוטל ע״י העסק",
};

// Errors raised by the booking RPCs (message) → Hebrew.
const ERRORS: Record<string, string> = {
  not_available: "השעה הזאת כבר לא פנויה. בחרו שעה אחרת.",
  slot_taken: "השעה הזאת כבר תפוסה. בחרו שעה אחרת.",
  phone_required: "צריך מספר טלפון כדי שהעסק יוכל ליצור קשר.",
  policy_required: "צריך לאשר את מדיניות הביטול.",
  too_many: "יש לכם כבר כמה תורים פתוחים כאן. אפשר לבטל אחד ולקבוע חדש.",
  own_business: "אי אפשר לקבוע תור בעסק של עצמך.",
  past: "התור כבר עבר.",
  "pro required": "זימון תורים זמין במנוי KamiPet ומעלה.",
};

export function bookingError(error: { message?: string; hint?: string } | null | undefined, fallback = "הפעולה נכשלה. נסו שוב.") {
  if (!error) return fallback;
  if (error.hint === "profanity" || error.message?.startsWith("profanity")) return "יש בטקסט מילים שאסור לפרסם.";
  if (error.hint === "limit") return "אפשר עד 20 שירותים.";
  return (error.message && ERRORS[error.message]) || fallback;
}

export function durationLabel(min: number) {
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hours = h === 1 ? "שעה" : h === 2 ? "שעתיים" : `${h} שעות`;
  return m ? `${hours} ו-${m} דק׳` : hours;
}

const timeFmt = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("he-IL", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" });
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // YYYY-MM-DD

export const timeLabel = (iso: string | Date) => timeFmt.format(new Date(iso));
export const dayLabel = (iso: string | Date) => dayFmt.format(new Date(iso));
export const shortDayLabel = (iso: string | Date) => shortDayFmt.format(new Date(iso));
/** The Israel calendar day of a moment, YYYY-MM-DD. */
export const dayKey = (iso: string | Date) => keyFmt.format(new Date(iso));

/** "היום", "מחר" or the weekday and date. */
export function relativeDayLabel(iso: string | Date, now = new Date()) {
  const k = dayKey(iso);
  if (k === dayKey(now)) return "היום";
  if (k === dayKey(new Date(now.getTime() + 86_400_000))) return "מחר";
  return dayLabel(iso);
}

/** The next `count` Israel calendar days from today, as YYYY-MM-DD. */
export function upcomingDays(count: number, now = new Date()) {
  const out: string[] = [];
  for (let i = 0; out.length < count && i < count + 2; i++) {
    const k = dayKey(new Date(now.getTime() + i * 86_400_000));
    if (!out.includes(k)) out.push(k);
  }
  return out;
}

/** Noon of an Israel calendar day, safe to pass to the formatters above. */
export const dayNoon = (key: string) => new Date(`${key}T12:00:00+03:00`);

export function waLink(phone: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? `972${d.slice(1)}` : d}`;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function israelParts(ms: number) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute };
}

/** "2026-10-02T09:30" (Israel time, from <input type="datetime-local">) → ISO, or null. */
export function israelLocalToISO(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = (ms: number) => {
    const p = israelParts(ms);
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ms;
  };
  const guess = wall - offset(wall);
  return new Date(wall - offset(guess)).toISOString();
}

/** ISO → "2026-10-02T09:30" in Israel time, for <input type="datetime-local">. */
export function isoToIsraelLocal(iso: string) {
  const p = israelParts(new Date(iso).getTime());
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${z(p.mo)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`;
}

/** Server pages: the moment of the request, and a time `ms` away from it. */
export function nowMs() {
  return Date.now();
}
export const isoFromNow = (ms: number) => new Date(Date.now() + ms).toISOString();
