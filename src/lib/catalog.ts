import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

// Categories, filters and cities change only when staff edit them in the admin
// panel, so they're cached across requests and invalidated by tag from there
// (see revalidateCatalog in admin/catalog/actions.ts).

export const CATALOG_TAG = "catalog";

export type CatalogCategory = { id: string; slug: string; name: string; icon: string | null; is_emergency: boolean };
export type CatalogFilter = {
  id: string;
  key: string;
  name: string;
  kind: "boolean" | "multi_select" | "open_now" | "distance";
  options: { value: string; label: string }[];
  is_featured: boolean;
  category_ids: string[];
};
export type CatalogCity = { name: string; aliases: string[]; lat: number; lng: number };

export const getCatalog = unstable_cache(
  async () => {
    const supabase = createPublicClient();
    const [categories, filters, cities] = await Promise.all([
      supabase.from("categories").select("id, slug, name, icon, is_emergency").eq("is_visible", true).order("sort_order"),
      supabase
        .from("filters")
        .select("id, key, name, kind, options, is_featured, category_filters(category_id)")
        .eq("is_visible", true)
        .order("sort_order"),
      supabase.from("cities").select("name, aliases, lat, lng").order("name"),
    ]);
    const error = categories.error ?? filters.error ?? cities.error;
    if (error) throw error; // not cached; the next request retries

    return {
      categories: (categories.data ?? []) as CatalogCategory[],
      filters: ((filters.data ?? []) as (Omit<CatalogFilter, "category_ids"> & { category_filters: { category_id: string }[] })[]).map(
        ({ category_filters, ...f }) => ({ ...f, category_ids: category_filters.map((c) => c.category_id) }),
      ),
      cities: (cities.data ?? []) as CatalogCity[],
    };
  },
  ["catalog-v2"],
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

// Filters a business can set (yes/no and multi-select), for business pages.
export async function getBusinessFilters() {
  const { filters } = await getCatalog();
  return filters.filter((f) => f.kind === "boolean" || f.kind === "multi_select");
}

export const BUSINESSES_TAG = "businesses";

// "New on Kami" on the home page: same for every visitor, so cached briefly.
// Invalidated when staff approve/feature a business or an owner edits theirs.
export const getFreshBusinesses = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient().rpc("search_businesses", { p_limit: 6 });
    if (error) throw error;
    return (data ?? []) as import("@/lib/search/load").SearchResult[];
  },
  ["fresh-businesses-v1"],
  { tags: [BUSINESSES_TAG], revalidate: 300 },
);
