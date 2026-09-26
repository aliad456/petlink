// Lock durations offered in the admin panel (hours; null = until released by hand).
export const LOCK_DURATIONS = [
  { hours: 48, label: "48 שעות" },
  { hours: 168, label: "7 ימים" },
  { hours: null, label: "עד שחרור ידני" },
] as const;

export const DEFAULT_LOCK_HOURS = 48;
