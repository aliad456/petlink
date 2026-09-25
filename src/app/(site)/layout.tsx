import { SiteHeader } from "@/components/site-header";

// Public pages share the header. Living in the layout, it stays put while
// pages change underneath it (only the page segment re-renders on navigation).
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
