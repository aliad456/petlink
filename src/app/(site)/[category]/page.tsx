import { MaintenanceGate } from "@/components/maintenance";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/search/search-view";
import { getActiveAds } from "@/lib/ads";
import { getFavoriteIds } from "@/lib/favorites";
import { loadSearchContext, runSearch } from "@/lib/search/load";
import { first } from "@/lib/search/params";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";

// /vets, /trainers … — one page per visible category (slugs are edited in the admin).
async function findCategory(slug: string) {
  const { categories } = await loadSearchContext();
  return categories.find((c) => c.slug === slug) ?? null;
}

// A city from ?city= that we know (so only real "category in city" pages are canonical).
async function findCity(raw: string | undefined) {
  if (!raw) return null;
  const { cities } = await loadSearchContext();
  return cities.find((c) => c.name === raw || c.aliases.includes(raw)) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[category]">): Promise<Metadata> {
  const category = await findCategory((await params).category);
  if (!category) return { title: "העמוד לא נמצא" };
  const city = await findCity(first((await searchParams).city));
  const title = city ? `${category.name} ב${city.name}` : category.name;
  // Filters, sorting and free text are views of the same page: Google gets one
  // canonical URL per category, or per category + city.
  const canonical = city ? `/${category.slug}?city=${encodeURIComponent(city.name)}` : `/${category.slug}`;
  const description = `${title}${city ? " והסביבה" : " בכל הארץ"}: טלפון, שעות פעילות, ביקורות ומי פתוח עכשיו. מצאו, השוו והתקשרו ישירות ב-Kami.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Kami`, description, url: canonical, locale: "he_IL", type: "website" },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[category]">) {
  const category = await findCategory((await params).category);
  if (!category) notFound();
  const sp = await searchParams;
  const [state, topAds, inlineAds, favoriteIds, gallery] = await Promise.all([
    runSearch(sp, { category }),
    getActiveAds("category"),
    getActiveAds("search"),
    getFavoriteIds(),
    category.is_adoption ? getActiveAds("adoption") : undefined,
  ]);
  const base = siteUrl();
  const title = state.city ? `${category.name} ב${state.city.name}` : category.name;
  const crumbs = [
    { name: "Kami", url: base },
    { name: category.name, url: `${base}/${category.slug}` },
    ...(state.city
      ? [{ name: state.city.name, url: `${base}/${category.slug}?city=${encodeURIComponent(state.city.name)}` }]
      : []),
  ];
  return (
    <MaintenanceGate path={`/${category.slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd(crumbs) }} />
      {state.results.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: itemListJsonLd(title, state.results.slice(0, 20).map((b) => `${base}/b/${b.public_id}`)),
          }}
        />
      )}
      <SearchView
        state={state}
        params={sp}
        basePath={`/${category.slug}`}
        topAds={topAds}
        inlineAds={inlineAds}
        favoriteIds={favoriteIds}
        gallery={gallery}
      />
    </MaintenanceGate>
  );
}
