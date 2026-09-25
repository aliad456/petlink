import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { getActiveAds } from "@/lib/ads";
import { getFavoriteIds } from "@/lib/favorites";
import { runSearch } from "@/lib/search/load";

export const metadata: Metadata = { title: "חיפוש" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const [state, inlineAds, favoriteIds] = await Promise.all([
    runSearch(params, { category: null }),
    getActiveAds("search"),
    getFavoriteIds(),
  ]);
  return <SearchView state={state} params={params} basePath="/search" inlineAds={inlineAds} favoriteIds={favoriteIds} />;
}
