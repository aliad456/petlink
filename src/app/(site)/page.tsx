import { HomeContent } from "@/components/home/home-content";
import { getActiveAds } from "@/lib/ads";
import { getFavoriteIds } from "@/lib/favorites";

export default async function HomePage() {
  const [ads, favoriteIds] = await Promise.all([getActiveAds("home"), getFavoriteIds()]);
  return <HomeContent ads={ads} favoriteIds={favoriteIds} />;
}
