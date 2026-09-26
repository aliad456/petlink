import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { requirePermission } from "@/lib/auth/session";
import { MAINTAINABLE_PAGES } from "@/lib/maintenance";
import { createClient } from "@/lib/supabase/server";
import { FilterTabs } from "../users/filter-tabs";
import { CategoryList } from "./category-list";
import { FilterList } from "./filter-list";
import { MaintenanceList, type MaintenancePage } from "./maintenance-list";
import type { CatalogCategory, CatalogFilter } from "./types";

export const metadata: Metadata = { title: "קטגוריות ופילטרים" };

export default async function CatalogPage({ searchParams }: PageProps<"/admin/catalog">) {
  const staff = await requirePermission("catalog.manage");
  const canMaintain = staff.isOwner || staff.permissions.has("site.maintenance");
  const { tab } = await searchParams;
  const showFilters = tab === "filters";
  const showMaintenance = tab === "maintenance" && canMaintain;

  const supabase = await createClient();
  const [{ data: categories }, { data: filterRows }, { data: closedRows }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, description, icon, is_visible, is_emergency, is_adoption")
      .order("sort_order")
      .returns<CatalogCategory[]>(),
    supabase
      .from("filters")
      .select("id, key, name, kind, options, is_featured, is_visible, category_filters(category_id)")
      .order("sort_order")
      .returns<(Omit<CatalogFilter, "category_ids"> & { category_filters: { category_id: string }[] })[]>(),
    supabase.from("page_maintenance").select("path").eq("enabled", true),
  ]);
  const closed = new Set((closedRows ?? []).map((r) => r.path as string));
  const page = (path: string, label: string, href = path): MaintenancePage => ({ path, label, href, closed: closed.has(path) });
  const maintenanceGroups = [
    { title: "דפים באתר", pages: MAINTAINABLE_PAGES.map((p) => page(p.path, p.label, p.path === "/b/*" ? "/search" : p.path)) },
    {
      title: "עמודי קטגוריות",
      pages: (categories ?? []).filter((c) => c.is_visible).map((c) => page(`/${c.slug}`, c.name)),
    },
  ];

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
            מה שמופיע באתר, באיזה סדר, ואילו פילטרים מוצעים לכל קטגוריה. במצב תחזוקה סוגרים דף לגולשים בזמן תיקון.
          </p>
        </header>

        <FilterTabs
          param="tab"
          current={showMaintenance ? "maintenance" : showFilters ? "filters" : null}
          searchParams={{ tab: typeof tab === "string" ? tab : undefined }}
          tabs={[
            { value: null, label: `קטגוריות (${categories?.length ?? 0})` },
            { value: "filters", label: `פילטרים (${filters.length})` },
            ...(canMaintain ? [{ value: "maintenance", label: `מצב תחזוקה${closed.size ? ` (${closed.size})` : ""}` }] : []),
          ]}
        />

        {showMaintenance ? (
          <MaintenanceList groups={maintenanceGroups} />
        ) : showFilters ? (
          <FilterList filters={filters} categories={categories ?? []} />
        ) : (
          <CategoryList categories={categories ?? []} />
        )}
      </div>
    </PageTransition>
  );
}
