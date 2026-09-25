import { HomeContent } from "@/components/home/home-content";
import { getActiveAds } from "@/lib/ads";

export default async function HomePage() {
  return <HomeContent ads={await getActiveAds("home")} />;
}
