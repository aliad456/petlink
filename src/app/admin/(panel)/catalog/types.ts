export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_visible: boolean;
};

export type FilterKind = "boolean" | "multi_select" | "open_now" | "distance";

export type FilterOption = { value: string; label: string };

export type CatalogFilter = {
  id: string;
  key: string;
  name: string;
  kind: FilterKind;
  options: FilterOption[];
  is_featured: boolean;
  is_visible: boolean;
  category_ids: string[];
};

export const KIND_LABEL: Record<FilterKind, string> = {
  boolean: "כן / לא",
  multi_select: "בחירה מרובה",
  open_now: "מחושב משעות הפעילות",
  distance: "מחושב מהמיקום",
};
