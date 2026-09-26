import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { AccessibilityMenu } from "@/components/accessibility-menu";
import { PointerGlow } from "@/components/pointer-glow";
import { SiteTracker } from "@/components/site-tracker";
import { Toaster } from "@/components/toast";
import { A11Y_BOOT } from "@/lib/a11y";
import { THEME_BOOT } from "@/lib/theme";
import { siteUrl } from "@/lib/supabase/env";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const DESCRIPTION = "וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ — עם פילטרים שגוגל מפות לא נותן.";

export const metadata: Metadata = {
  // Absolute URLs for share images, canonical links and the sitemap.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Kami — כל השירותים לחיות מחמד במקום אחד",
    template: "%s | Kami",
  },
  description: DESCRIPTION,
  applicationName: "Kami",
  // The share picture comes from ./opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: "Kami",
    locale: "he_IL",
    title: "Kami — כל השירותים לחיות מחמד במקום אחד",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Kami", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f4" },
    { media: "(prefers-color-scheme: dark)", color: "#05080b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Accessibility preferences before first paint (see src/lib/a11y.ts). */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOT + THEME_BOOT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
        <PointerGlow />
        <AccessibilityMenu />
        <SiteTracker />
      </body>
    </html>
  );
}
