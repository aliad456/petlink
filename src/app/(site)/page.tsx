import type { Metadata } from "next";
import { HomeContent } from "@/components/home/home-content";
import { getActiveAds } from "@/lib/ads";
import { getFavoriteIds } from "@/lib/favorites";
import { siteJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/supabase/env";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [ads, favoriteIds] = await Promise.all([getActiveAds("home"), getFavoriteIds()]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLd(siteUrl()) }} />
      <HomeContent ads={ads} favoriteIds={favoriteIds} />
    </>
  );
}
