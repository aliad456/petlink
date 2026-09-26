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
  // closesIn: minutes until closing (null when it runs on into the next day).
  | { open: true; closesAt: string; closesIn: number | null; always: boolean }
  | { open: false; opensAt: string | null; opensDay: number | null };

export function openState(hours: Hours, now = israelNow()): OpenState {
  const today = hours[String(now.day) as keyof Hours] ?? [];
  for (const [from, to] of today) {
    const start = toMinutes(from);
    let end = toMinutes(to);
    if (end <= start) end += 24 * 60; // closes after midnight
    if (now.minutes >= start && now.minutes < end) {
      const tomorrow = hours[String((now.day + 1) % 7) as keyof Hours] ?? [];
      const continues = end >= toMinutes("23:59") && tomorrow.some(([f]) => toMinutes(f) === 0);
      const always = [0, 1, 2, 3, 4, 5, 6].every((d) =>
        (hours[String(d) as keyof Hours] ?? []).some(([f, t]) => toMinutes(f) === 0 && toMinutes(t) >= toMinutes("23:59")),
      );
      return { open: true, closesAt: to, closesIn: continues ? null : end - now.minutes, always };
    }
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

// Closing within the hour: shown as a warning ("נסגר בעוד 25 דק׳").
export const CLOSING_SOON_MINUTES = 60;

export function isClosingSoon(state: OpenState) {
  return state.open && state.closesIn !== null && state.closesIn <= CLOSING_SOON_MINUTES;
}

// "פתוח · עד 19:00" · "נסגר בעוד 25 דק׳" · "סגור · נפתח מחר ב-09:00".
// short: the result cards (no "עכשיו", and only the day name further ahead).
export function openLabel(state: OpenState, now = israelNow(), short = false) {
  if (state.open) {
    if (state.always) return "פתוח 24/7";
    if (isClosingSoon(state)) return `נסגר בעוד ${Math.max(1, state.closesIn!)} דק׳`;
    const open = short ? "פתוח" : "פתוח עכשיו";
    return state.closesIn === null ? open : `${open} · עד ${state.closesAt}`;
  }
  if (!state.opensAt || state.opensDay === null) return short ? "סגור עכשיו" : "סגור";
  const when =
    state.opensDay === now.day
      ? `היום ב-${state.opensAt}`
      : state.opensDay === (now.day + 1) % 7
        ? `מחר ב-${state.opensAt}`
        : short
          ? `ביום ${DAY_NAMES[state.opensDay]}`
          : `ביום ${DAY_NAMES[state.opensDay]} ב-${state.opensAt}`;
  return `סגור · נפתח ${when}`;
}
