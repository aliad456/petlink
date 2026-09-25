import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { runSearch } from "@/lib/search/load";

export const metadata: Metadata = { title: "חיפוש" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const state = await runSearch(params, { category: null });
  return <SearchView state={state} params={params} basePath="/search" />;
}
