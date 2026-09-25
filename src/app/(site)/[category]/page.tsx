import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchView } from "@/components/search/search-view";
import { getActiveAds } from "@/lib/ads";
import { loadSearchContext, runSearch } from "@/lib/search/load";
import { first } from "@/lib/search/params";

// /vets, /trainers … — one page per visible category (slugs are edited in the admin).
async function findCategory(slug: string) {
  const { categories } = await loadSearchContext();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[category]">): Promise<Metadata> {
  const category = await findCategory((await params).category);
  if (!category) return { title: "העמוד לא נמצא" };
  const city = first((await searchParams).city);
  const title = city ? `${category.name} ב${city}` : category.name;
  return {
    title,
    description: `${title} — מצאו, השוו והתקשרו ישירות. כולל מי פתוח עכשיו, מי מגיע עד הבית ומי עובד בשבת.`,
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[category]">) {
  const category = await findCategory((await params).category);
  if (!category) notFound();
  const sp = await searchParams;
  const [state, topAds, inlineAds] = await Promise.all([
    runSearch(sp, { category }),
    getActiveAds("category"),
    getActiveAds("search"),
  ]);
  return (
    <SearchView state={state} params={sp} basePath={`/${category.slug}`} topAds={topAds} inlineAds={inlineAds} />
  );
}
