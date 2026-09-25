import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

// /sitemap.xml for Google: home, categories, every live business page and the
// legal pages. Rebuilt at most once an hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [{ categories }, { data: businesses }] = await Promise.all([
    getCatalog(),
    createPublicClient()
      .from("businesses")
      .select("public_id, updated_at")
      .eq("status", "approved")
      .order("public_id")
      .limit(45000)
      .returns<{ public_id: number; updated_at: string }[]>(),
  ]);

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...categories.map((c) => ({ url: `${base}/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${base}/deals`, changeFrequency: "daily", priority: 0.6 },
    ...(businesses ?? []).map((b) => ({
      url: `${base}/b/${b.public_id}`,
      lastModified: b.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...["/contact", "/terms", "/privacy", "/business-terms", "/accessibility"].map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
