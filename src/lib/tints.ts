// Soft colour pairs for category tiles, card covers and avatar fallbacks, so each
// field has its own colour instead of one gradient everywhere. Picked from the
// category's icon/slug, so the same field always gets the same colour.
// Full class strings (not built at runtime) so Tailwind can see them.

export const TINTS = [
  // שמש
  { tile: "bg-[#fff0c2] text-[#8a5a00] dark:bg-[#3a2f12] dark:text-[#ffd666]", solid: "bg-[#ffd75e] text-[#4a3300]" },
  // מנטה
  { tile: "bg-[#d8f3e4] text-[#1d7046] dark:bg-[#15302a] dark:text-[#7fe0b0]", solid: "bg-[#8fdcb2] text-[#0f3d26]" },
  // אפרסק
  { tile: "bg-[#ffe2d6] text-[#a8401f] dark:bg-[#3a201a] dark:text-[#ffab91]", solid: "bg-[#ffb79a] text-[#5a1f0c]" },
  // שמיים
  { tile: "bg-[#dbeeff] text-[#1b6199] dark:bg-[#152a3d] dark:text-[#8cc8ff]", solid: "bg-[#9fd0f7] text-[#0b3456]" },
  // לילך
  { tile: "bg-[#ebe3ff] text-[#5b3db0] dark:bg-[#2a2140] dark:text-[#c3b0ff]", solid: "bg-[#c4b3fb] text-[#2b1a63]" },
] as const;

export type Tint = (typeof TINTS)[number];

// Common category icons get a fixed colour so the main fields never share one;
// anything else falls back to a hash of the name.
const BY_ICON: Record<string, number> = {
  stethoscope: 3, hospital: 3, syringe: 3, pill: 3,
  dog: 0, bone: 0, "paw-print": 0, graduation: 0,
  store: 1, "shopping-bag": 1, house: 1, home: 1, trees: 1,
  scissors: 4, sparkles: 4, bath: 4, "shower-head": 4,
  heart: 2, "hand-heart": 2, cat: 2, car: 2,
};

export function tintFor(key: string | null | undefined): Tint {
  const s = key ?? "";
  if (s in BY_ICON) return TINTS[BY_ICON[s]];
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return TINTS[h % TINTS.length];
}
