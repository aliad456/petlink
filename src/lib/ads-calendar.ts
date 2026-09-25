// Calendar helpers for the ads admin (plain dates, no time zones: "YYYY-MM-DD").

export type Reserved = "adoption" | "ads";
export type DateRule = { day: string; reserved_for: Reserved | "open"; label: string | null };
export type Rules = { weekdays: Record<number, Reserved>; dates: Record<string, DateRule> };

export const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
export const WEEKDAYS_SHORT = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const RESERVED_LABEL: Record<Reserved, string> = { adoption: "שמור לאימוץ", ads: "שמור לפרסום" };

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

export function weekday(key: string) {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(key: string, n: number) {
  const { y, m, d } = parseKey(key);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return toKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function monthKey(key: string) {
  return key.slice(0, 7);
}

export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}

export function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

// Weeks (Sunday first) covering the month; null = padding cell.
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(toKey(y, m, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function reservation(key: string, rules: Rules): { reserved: Reserved | null; label: string | null } {
  const rule = rules.dates[key];
  if (rule) return { reserved: rule.reserved_for === "open" ? null : rule.reserved_for, label: rule.label };
  return { reserved: rules.weekdays[weekday(key)] ?? null, label: null };
}

export function shortDate(key: string) {
  const { m, d } = parseKey(key);
  return `${d}/${m}`;
}
