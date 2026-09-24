const TZ = "Asia/Jerusalem";

const dateTime = new Intl.DateTimeFormat("he-IL", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const date = new Intl.DateTimeFormat("he-IL", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const relative = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}

export function formatDate(value: string | Date) {
  return date.format(new Date(value));
}

// ICU's Hebrew data appends the number to dual/singular forms: "לפני שעתיים (2)".
const rel = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
  relative.format(value, unit).replace(/\s*\(\d+\)$/, "");

// "לפני 3 ימים", "אתמול", "לפני שעה"
export function formatRelative(value: string | Date, now = Date.now()) {
  const diffSec = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "עכשיו";
  if (abs < 3600) return rel(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rel(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rel(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rel(Math.round(diffSec / (86400 * 30)), "month");
  return rel(Math.round(diffSec / (86400 * 365)), "year");
}
