import { cookies } from "next/headers";
import { BetaBanner } from "@/components/beta";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BETA_COOKIE } from "@/lib/site";

// Public pages share the header and footer. Living in the layout, they stay put
// while pages change underneath (only the page segment re-renders on navigation).
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const betaSeen = (await cookies()).has(BETA_COOKIE);
  return (
    <>
      <SiteHeader />
      {!betaSeen && <BetaBanner />}
      {children}
      <SiteFooter />
    </>
  );
}
