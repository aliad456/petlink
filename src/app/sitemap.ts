import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// /sitemap.xml for Google: home, categories, "category in city" pages that have
// businesses, every live business page and the legal pages. Rebuilt at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [{ categories, cities }, { data: businesses }] = await Promise.all([
    getCatalog(),
    createPublicClient()
      .from("businesses")
      .select("public_id, updated_at, category_id, city")
      .eq("status", "approved")
      .order("public_id")
      .limit(45000)
      .returns<{ public_id: number; updated_at: string; category_id: string; city: string | null }[]>(),
  ]);

  // "וטרינרים בבאר שבע" — only pairs with at least one business in that city.
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const cityByName = new Map(cities.flatMap((c) => [c.name, ...c.aliases].map((n) => [n, c.name] as const)));
  const pairs = new Set<string>();
  for (const b of businesses ?? []) {
    const slug = slugById.get(b.category_id);
    const city = b.city && cityByName.get(b.city.trim());
    if (slug && city) pairs.add(`${slug}?city=${encodeURIComponent(city)}`);
  }

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...categories.map((c) => ({ url: `${base}/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...[...pairs].map((p) => ({ url: `${base}/${p}`, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${base}/deals`, changeFrequency: "daily", priority: 0.6 },
    ...(businesses ?? []).map((b) => ({
      url: `${base}/b/${b.public_id}`,
      lastModified: b.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["/recommended", "/contact", "/terms", "/privacy", "/business-terms", "/accessibility", "/delete-account"].map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
