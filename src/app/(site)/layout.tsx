import { cookies } from "next/headers";
import { AdPopup } from "@/components/ads/ad-popup";
import { BetaBanner } from "@/components/beta";
import { BottomNav } from "@/components/bottom-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActiveAds } from "@/lib/ads";
import { getCurrentProfile } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/own";
import { BETA_COOKIE } from "@/lib/site";

// Public pages share the header and footer. Living in the layout, they stay put
// while pages change underneath (only the page segment re-renders on navigation).
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [jar, popup, own, profile] = await Promise.all([
    cookies(),
    getActiveAds("popup"),
    getOwnBusiness(),
    getCurrentProfile(),
  ]);
  const betaSeen = jar.has(BETA_COOKIE);
  return (
    <>
      <SiteHeader />
      {!betaSeen && <BetaBanner />}
      {children}
      <SiteFooter />
      {/* Room for the bottom tab bar so the footer isn't hidden behind it. */}
      <div aria-hidden className="h-[var(--bottom-nav)]" />
      <BottomNav signedIn={!!profile} />
      {/* PRO subscribers never see the popup. */}
      <AdPopup ad={own?.plan === "pro" ? null : (popup[0] ?? null)} />
      <InstallPrompt />
    </>
  );
}
