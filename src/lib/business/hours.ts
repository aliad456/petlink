import type { Hours } from "./types";

export const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

const WEEKDAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Current day and minute-of-day in Israel, regardless of the viewer's timezone.
export function israelNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { day: WEEKDAY[get("weekday")] ?? 0, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

export type OpenState =
  | { open: true; closesAt: string }
  | { open: false; opensAt: string | null; opensDay: number | null };

export function openState(hours: Hours, now = israelNow()): OpenState {
  const today = hours[String(now.day) as keyof Hours] ?? [];
  for (const [from, to] of today) {
    const start = toMinutes(from);
    let end = toMinutes(to);
    if (end <= start) end += 24 * 60; // closes after midnight
    if (now.minutes >= start && now.minutes < end) return { open: true, closesAt: to };
  }
  // Next opening: later today, then the following days.
  for (let offset = 0; offset < 7; offset++) {
    const day = (now.day + offset) % 7;
    const ranges = [...(hours[String(day) as keyof Hours] ?? [])].sort((a, b) => toMinutes(a[0]) - toMinutes(b[0]));
    for (const [from] of ranges) {
      if (offset > 0 || toMinutes(from) > now.minutes) return { open: false, opensAt: from, opensDay: day };
    }
  }
  return { open: false, opensAt: null, opensDay: null };
}

export function hasAnyHours(hours: Hours) {
  return Object.values(hours).some((r) => r && r.length > 0);
}
