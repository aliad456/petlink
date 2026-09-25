import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdPopup } from "@/components/ads/ad-popup";
import type { BannerAd } from "@/components/ads/ad-banner";
import { HomeContent } from "@/components/home/home-content";
import { SearchView } from "@/components/search/search-view";
import { getAdPreview, type Placement } from "@/lib/ads";
import { getStaffContext } from "@/lib/auth/session";
import { loadSearchContext, runSearch } from "@/lib/search/load";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "תצוגה מקדימה", robots: { index: false, follow: false } };

const PLACEMENTS: Placement[] = ["home", "category", "search", "popup"];

// The real page with one ad in its place. Shown inside an iframe by the ad
// editor (token "draft" + the unsaved values, staff only) and by the link
// sent to advertisers (the campaign's preview token).
export default async function AdPreviewFrame({ params, searchParams }: PageProps<"/preview-frame/ad/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  let ad: BannerAd;
  let placement: Placement;

  if (token === "draft") {
    const staff = await getStaffContext();
    if (!staff || !(staff.isOwner || staff.permissions.has("banners.manage"))) notFound();
    placement = PLACEMENTS.find((p) => p === str("p")) ?? "home";
    const supabase = await createClient();
    const { data: row } = await supabase
      .from("ad_placements")
      .select("image_width, image_height, mobile_width, mobile_height")
      .eq("key", placement)
      .single<{ image_width: number; image_height: number; mobile_width: number | null; mobile_height: number | null }>();
    if (!row || !str("img")) notFound();
    ad = {
      id: "draft",
      kind: str("kind") === "adoption" ? "adoption" : "ad",
      advertiser: "",
      alt_text: str("alt") || "מודעה",
      image_path: str("img"),
      mobile_image_path: str("mimg") || null,
      has_link: false,
      width: row.image_width,
      height: row.image_height,
      mobile_width: row.mobile_width,
      mobile_height: row.mobile_height,
    };
  } else {
    if (!isUuid(token)) notFound();
    const p = await getAdPreview(token);
    if (!p) notFound();
    placement = p.placement;
    ad = { ...p, has_link: false };
  }

  if (placement === "home") return <HomeContent ads={[ad]} preview />;
  if (placement === "popup") {
    return (
      <>
        <HomeContent ads={[]} preview />
        <AdPopup ad={ad} preview />
      </>
    );
  }
  if (placement === "category") {
    const { categories } = await loadSearchContext();
    const category = categories[0];
    if (!category) return <HomeContent ads={[]} preview />;
    const state = await runSearch({}, { category });
    return <SearchView state={state} params={{}} basePath={`/${category.slug}`} topAds={[ad]} preview />;
  }
  const state = await runSearch({}, { category: null });
  return <SearchView state={state} params={{}} basePath="/search" inlineAds={[ad]} preview />;
}
