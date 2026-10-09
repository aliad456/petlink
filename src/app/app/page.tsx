import type { Metadata } from "next";
import { AppLanding } from "./app-landing";

// "Download the app" landing page, for ads (heykami.co.il/app?utm_source=meta).
// Not linked from the site and kept out of search results.
export const metadata: Metadata = {
  title: "האפליקציה של Kami",
  description: "וטרינרים, מאלפים, פנסיונים, מספרות וימי אימוץ לכלבים וחתולים, באפליקציה אחת.",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <AppLanding />;
}
