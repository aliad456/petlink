import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FilterTabs } from "../users/filter-tabs";
import { CategoryList } from "./category-list";
import { FilterList } from "./filter-list";
import type { CatalogCategory, CatalogFilter } from "./types";

export const metadata: Metadata = { title: "קטגוריות ופילטרים" };

export default async function CatalogPage({ searchParams }: PageProps<"/admin/catalog">) {
  await requirePermission("catalog.manage");
  const { tab } = await searchParams;
  const showFilters = tab === "filters";

  const supabase = await createClient();
  const [{ data: categories }, { data: filterRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, description, icon, is_visible, is_emergency")
      .order("sort_order")
      .returns<CatalogCategory[]>(),
    supabase
      .from("filters")
      .select("id, key, name, kind, options, is_featured, is_visible, category_filters(category_id)")
      .order("sort_order")
      .returns<(Omit<CatalogFilter, "category_ids"> & { category_filters: { category_id: string }[] })[]>(),
  ]);

  const filters: CatalogFilter[] = (filterRows ?? []).map(({ category_filters, ...f }) => ({
    ...f,
    category_ids: category_filters.map((c) => c.category_id),
  }));

  return (
    <PageTransition>
      <div className="flex max-w-3xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">קטגוריות ופילטרים</h1>
          <p className="mt-1 text-muted">
            מה שמופיע באתר, באיזה סדר, ואילו פילטרים מוצעים לכל קטגוריה.
          </p>
        </header>

        <FilterTabs
          param="tab"
          current={showFilters ? "filters" : null}
          searchParams={{ tab: typeof tab === "string" ? tab : undefined }}
          tabs={[
            { value: null, label: `קטגוריות (${categories?.length ?? 0})` },
            { value: "filters", label: `פילטרים (${filters.length})` },
          ]}
        />

        {showFilters ? (
          <FilterList filters={filters} categories={categories ?? []} />
        ) : (
          <CategoryList categories={categories ?? []} />
        )}
      </div>
    </PageTransition>
  );
}
