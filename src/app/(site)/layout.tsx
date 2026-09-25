import { cookies } from "next/headers";
import { AdPopup } from "@/components/ads/ad-popup";
import { BetaBanner } from "@/components/beta";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveAds } from "@/lib/ads";
import { BETA_COOKIE } from "@/lib/site";

// Public pages share the header and footer. Living in the layout, they stay put
// while pages change underneath (only the page segment re-renders on navigation).
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [jar, popup] = await Promise.all([cookies(), getActiveAds("popup")]);
  const betaSeen = jar.has(BETA_COOKIE);
  return (
    <>
      <SiteHeader />
      {!betaSeen && <BetaBanner />}
      {children}
      <SiteFooter />
      <AdPopup ad={popup[0] ?? null} />
    </>
  );
}
