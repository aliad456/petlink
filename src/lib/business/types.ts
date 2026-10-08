// Shared by the public business page, the owner's editor (live preview) and admin.

export type BusinessStatus = "draft" | "pending" | "approved" | "suspended" | "removed";

export type Hours = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", [string, string][]>>;

export type PriceItem = { title: string; price: string; note?: string };

/** Adoption events (organisations), shown separately from opening hours. */
export type AdoptionDays = { enabled: boolean; days: Hours; note?: string | null };

export const SECTION_IDS = ["stats", "details", "about", "hours", "adoption", "gallery", "prices", "links"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABEL: Record<SectionId, string> = {
  stats: "פס הישגים",
  details: "פרטים",
  about: "אודות",
  hours: "שעות פעילות",
  adoption: "ימי אימוץ",
  gallery: "גלריה",
  prices: "מחירון",
  links: "רשתות וקישורים",
};

export type DesignMode = "default" | "personal";
export type Layout = "classic" | "side";

export type Design = {
  mode: DesignMode;
  accent?: AccentKey;
  layout?: Layout;
  sections?: { id: SectionId; visible: boolean }[];
};

export const ACCENTS = {
  kami: { label: "Kami", from: "#22d3ee", to: "#2563eb" },
  teal: { label: "טורקיז", from: "#2dd4bf", to: "#0e7490" },
  sky: { label: "תכלת", from: "#38bdf8", to: "#1d4ed8" },
  indigo: { label: "אינדיגו", from: "#818cf8", to: "#4338ca" },
  violet: { label: "סגול", from: "#c084fc", to: "#7e22ce" },
  rose: { label: "ורוד", from: "#fb7185", to: "#be123c" },
  orange: { label: "כתום", from: "#fb923c", to: "#c2410c" },
  amber: { label: "זהב", from: "#fbbf24", to: "#b45309" },
  emerald: { label: "ירוק", from: "#34d399", to: "#047857" },
} as const;
export type AccentKey = keyof typeof ACCENTS;

export type FeatureValue = {
  filterId: string;
  name: string;
  kind: "boolean" | "multi_select";
  labels: string[]; // for multi_select: chosen option labels
};

export type BusinessPhoto = {
  id: string;
  path: string;
  caption: string | null;
  kind: "image" | "video";
  /** Videos: a still the browser cut from the clip before upload. */
  poster_path: string | null;
  /** Shown first in the gallery (one per business). */
  pinned: boolean;
};

export type BusinessView = {
  id: string;
  public_id: number;
  status: BusinessStatus;
  /** Created by staff from public info and not managed by the owner yet. */
  unclaimed?: boolean;
  /** Average of published reviews (null when there are none). */
  rating_avg?: number | null;
  review_count?: number;
  /** Running deal ("מבצע") and its last day (YYYY-MM-DD). */
  deal_text?: string | null;
  deal_until?: string | null;
  /** Pets on Kami adopted from this business (organisations). */
  adopted_count?: number;
  name: string;
  tagline: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  city: string | null;
  address: string | null;
  service_area: string | null;
  years_experience: number | null;
  animals_served: number | null;
  languages: string[];
  certifications: string[];
  hours: Hours;
  open_on_holidays: boolean;
  adoption_days?: AdoptionDays | null;
  price_list: PriceItem[];
  avatar_path: string | null;
  cover_path: string | null;
  design: Design;
  plan: "free" | "pro";
  category: { id: string; name: string; icon: string | null };
  photos: BusinessPhoto[];
  features: FeatureValue[];
};

export const LANGUAGES = [
  "עברית",
  "אנגלית",
  "רוסית",
  "ערבית",
  "אמהרית",
  "צרפתית",
  "ספרדית",
  "יידיש",
] as const;

export const GALLERY_LIMIT_FREE = 12;
export const GALLERY_VIDEO_LIMIT = 3;
export const GALLERY_VIDEO_MAX_SECONDS = 60;
export const GALLERY_VIDEO_MAX_MB = 50;

// Gallery order: the pinned item first, then the owner's order (oldest first).
export function sortGallery<T extends { pinned: boolean; sort_order: number; created_at: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );
}

// The effective design: "default" ignores personal colour, layout and order,
// but a section the owner switched off stays off in every mode.
export function resolveDesign(design: Design) {
  const personal = design.mode === "personal";
  const hidden = new Set(design.sections?.filter((s) => !s.visible).map((s) => s.id));
  const order =
    personal && design.sections?.length
      ? [
          ...design.sections.filter((s) => SECTION_IDS.includes(s.id)).map((s) => s.id),
          ...SECTION_IDS.filter((id) => !design.sections!.some((s) => s.id === id)),
        ]
      : [...SECTION_IDS];
  return {
    accent: ACCENTS[(personal && design.accent) || "kami"] ?? ACCENTS.kami,
    layout: (personal && design.layout) || "classic",
    sections: order.filter((id) => !hidden.has(id)),
  };
}

export function isSectionVisible(design: Design, id: SectionId) {
  return !design.sections?.some((s) => s.id === id && !s.visible);
}

export function setSectionVisible(design: Design, id: SectionId, visible: boolean): Design {
  const sections = SECTION_IDS.map((sid) => design.sections?.find((s) => s.id === sid) ?? { id: sid, visible: true });
  const ordered = design.sections?.length
    ? [...design.sections.filter((s) => SECTION_IDS.includes(s.id)), ...sections.filter((s) => !design.sections!.some((d) => d.id === s.id))]
    : sections;
  return { ...design, sections: ordered.map((s) => (s.id === id ? { ...s, visible } : s)) };
}
