// "חיית המחמד שלי": shared types and labels (server and client).

export const PET_BUCKET = "pet-media";

export const SPECIES = {
  dog: { label: "כלב", emoji: "🐶" },
  cat: { label: "חתול", emoji: "🐱" },
  bird: { label: "תוכי / ציפור", emoji: "🦜" },
  rabbit: { label: "ארנב", emoji: "🐰" },
  rodent: { label: "מכרסם", emoji: "🐹" },
  fish: { label: "דג", emoji: "🐠" },
  reptile: { label: "זוחל", emoji: "🦎" },
  other: { label: "אחר", emoji: "🐾" },
} as const;

export type Species = keyof typeof SPECIES;

export const SEX_LABEL = { male: "זכר", female: "נקבה", unknown: "לא ידוע" } as const;

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: keyof typeof SEX_LABEL;
  birth_date: string | null;
  birth_date_estimated: boolean;
  weight_kg: number | null;
  neutered: boolean | null;
  microchip: string | null;
  medical_notes: string | null;
  notes: string | null;
  adopted: boolean;
  adopted_from_business: string | null;
  adopted_from_text: string | null;
  adopted_on: string | null;
  avatar_path: string | null;
  share_token: string;
  share_link_enabled: boolean;
  created_at: string;
};

export type PetVaccine = { id?: string; name: string; given_on: string | null; next_due: string | null; notes: string | null };

export const PET_COLUMNS =
  "id, name, species, breed, sex, birth_date, birth_date_estimated, weight_kg, neutered, microchip, medical_notes, notes, adopted, adopted_from_business, adopted_from_text, adopted_on, avatar_path, share_token, share_link_enabled, created_at";

export function petMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${PET_BUCKET}/${path}`;
}

// "בן 3", "בת 7 חודשים", "בן 2 (בערך)"
export function petAge(p: Pick<Pet, "birth_date" | "birth_date_estimated" | "sex">, today = new Date()): string | null {
  if (!p.birth_date) return null;
  const [y, m, d] = p.birth_date.split("-").map(Number);
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  if (months < 0) return null;
  const ben = p.sex === "female" ? "בת" : "בן";
  const text =
    months < 1
      ? "פחות מחודש"
      : months < 12
        ? `${ben} ${months === 1 ? "חודש" : `${months} חודשים`}`
        : `${ben} ${Math.floor(months / 12) === 1 ? "שנה" : `${Math.floor(months / 12)}`}`;
  return p.birth_date_estimated ? `${text} (בערך)` : text;
}

export function shortDay(day: string | null) {
  if (!day) return "";
  const [y, m, d] = day.split("-").map(Number);
  return `${d}/${m}/${String(y).slice(2)}`;
}
