import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { PointerGlow } from "@/components/pointer-glow";
import { Toaster } from "@/components/toast";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kami — כל השירותים לחיות מחמד במקום אחד",
    template: "%s | Kami",
  },
  description:
    "וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ — עם פילטרים שגוגל מפות לא נותן.",
  applicationName: "Kami",
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
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
        <PointerGlow />
      </body>
    </html>
  );
}
