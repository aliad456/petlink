import type { BusinessView, FeatureValue } from "./types";

export const BUSINESS_COLUMNS =
  "id, public_id, owner_id, category_id, status, status_reason, is_featured, name, tagline, bio, phone, whatsapp, email, website, instagram, facebook, tiktok, city, address, service_area, years_experience, animals_served, languages, certifications, hours, open_on_holidays, price_list, avatar_path, cover_path, design, plan, pro_waitlist_at, submitted_at, created_at, category:categories(id, name, icon), photos:business_photos(id, path, caption, sort_order, created_at), values:business_filter_values(filter_id, bool_value, option_values)";

export type FilterDef = {
  id: string;
  name: string;
  kind: "boolean" | "multi_select" | "open_now" | "distance";
  options: { value: string; label: string }[];
  category_ids: string[];
};

export type FilterValueRow = { filter_id: string; bool_value: boolean | null; option_values: string[] };

export type BusinessRow = Omit<BusinessView, "photos" | "features" | "category"> & {
  owner_id: string;
  category_id: string;
  status_reason: string | null;
  is_featured: boolean;
  pro_waitlist_at: string | null;
  submitted_at: string | null;
  created_at: string;
  category: BusinessView["category"];
  photos: (BusinessView["photos"][number] & { sort_order: number; created_at: string })[];
  values: FilterValueRow[];
};

export function filtersForCategory(filters: FilterDef[], categoryId: string) {
  return filters.filter((f) => f.category_ids.length === 0 || f.category_ids.includes(categoryId));
}

export function resolveFeatures(
  filters: FilterDef[],
  categoryId: string,
  values: FilterValueRow[],
): FeatureValue[] {
  const byId = new Map(values.map((v) => [v.filter_id, v]));
  const out: FeatureValue[] = [];
  for (const f of filtersForCategory(filters, categoryId)) {
    const v = byId.get(f.id);
    if (!v) continue;
    if (f.kind === "boolean" && v.bool_value) {
      out.push({ filterId: f.id, name: f.name, kind: "boolean", labels: [] });
    } else if (f.kind === "multi_select") {
      const labels = f.options.filter((o) => v.option_values.includes(o.value)).map((o) => o.label);
      if (labels.length) out.push({ filterId: f.id, name: f.name, kind: "multi_select", labels });
    }
  }
  return out;
}

export function toView(row: BusinessRow, filters: FilterDef[]): BusinessView {
  return {
    ...row,
    photos: [...row.photos]
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map(({ id, path, caption }) => ({ id, path, caption })),
    features: resolveFeatures(filters, row.category_id, row.values),
  };
}
