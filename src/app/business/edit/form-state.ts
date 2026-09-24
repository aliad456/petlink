import type { BusinessRow, FilterDef } from "@/lib/business/load";
import { resolveFeatures } from "@/lib/business/load";
import type { BusinessView, Design, Hours, PriceItem } from "@/lib/business/types";
import type { SaveInput } from "../actions";

export type FormState = {
  name: string;
  category_id: string;
  tagline: string;
  bio: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  city: string;
  address: string;
  service_area: string;
  years_experience: string;
  animals_served: string;
  languages: string[];
  certifications: string[];
  hours: Hours;
  open_on_holidays: boolean;
  price_list: PriceItem[];
  design: Design;
  filter_values: Record<string, { bool?: boolean; options?: string[] }>;
};

export function toForm(b: BusinessRow): FormState {
  return {
    name: b.name,
    category_id: b.category_id,
    tagline: b.tagline ?? "",
    bio: b.bio ?? "",
    phone: b.phone ?? "",
    whatsapp: b.whatsapp ?? "",
    email: b.email ?? "",
    website: b.website ?? "",
    instagram: b.instagram ?? "",
    facebook: b.facebook ?? "",
    tiktok: b.tiktok ?? "",
    city: b.city ?? "",
    address: b.address ?? "",
    service_area: b.service_area ?? "",
    years_experience: b.years_experience?.toString() ?? "",
    animals_served: b.animals_served?.toString() ?? "",
    languages: b.languages,
    certifications: b.certifications,
    hours: b.hours,
    open_on_holidays: b.open_on_holidays,
    price_list: b.price_list,
    design: b.design,
    filter_values: Object.fromEntries(
      b.values.map((v) => [v.filter_id, { bool: v.bool_value ?? undefined, options: v.option_values }]),
    ),
  };
}

const num = (s: string) => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
};

export function toSaveInput(f: FormState): SaveInput {
  return {
    ...f,
    years_experience: num(f.years_experience),
    animals_served: num(f.animals_served),
    languages: f.languages as SaveInput["languages"],
    certifications: f.certifications.map((c) => c.trim()).filter(Boolean),
    price_list: f.price_list.filter((p) => p.title.trim() || p.price.trim()),
  };
}

// What the live preview renders: saved media + the unsaved form.
export function previewView(
  business: BusinessRow,
  form: FormState,
  categories: { id: string; name: string; icon: string | null }[],
  filters: FilterDef[],
): BusinessView {
  const input = toSaveInput(form);
  const category = categories.find((c) => c.id === form.category_id) ?? business.category;
  return {
    ...business,
    ...form,
    tagline: form.tagline.trim() || null,
    bio: form.bio.trim() || null,
    phone: form.phone || null,
    whatsapp: form.whatsapp || null,
    email: form.email || null,
    website: form.website || null,
    instagram: form.instagram || null,
    facebook: form.facebook || null,
    tiktok: form.tiktok || null,
    city: form.city || null,
    address: form.address || null,
    service_area: form.service_area || null,
    years_experience: input.years_experience ?? null,
    animals_served: input.animals_served ?? null,
    certifications: input.certifications,
    price_list: input.price_list,
    category,
    photos: [...business.photos]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map(({ id, path, caption }) => ({ id, path, caption })),
    features: resolveFeatures(
      filters,
      form.category_id,
      Object.entries(form.filter_values).map(([filter_id, v]) => ({
        filter_id,
        bool_value: v.bool ?? null,
        option_values: v.options ?? [],
      })),
    ),
  };
}
