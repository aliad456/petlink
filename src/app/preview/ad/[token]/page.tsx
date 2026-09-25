import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevicePreview } from "@/components/ads/device-preview";
import { LogoMark } from "@/components/logo";
import { getAdPreview } from "@/lib/ads";
import { shortDate } from "@/lib/ads-calendar";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "תצוגה מקדימה למודעה", robots: { index: false, follow: false } };

const WHERE: Record<string, string> = {
  home: "בתחתית דף הבית",
  category: "בראש עמודי הקטגוריה",
  search: "בין תוצאות החיפוש",
  popup: "כפופאפ בכניסה לאתר",
};

// The link sent to an advertiser: how their ad will look on Kami, on a phone
// and on a computer.
export default async function AdPreviewPage({ params }: PageProps<"/preview/ad/[token]">) {
  const { token } = await params;
  if (!isUuid(token)) notFound();
  const ad = await getAdPreview(token);
  if (!ad) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-5 px-4 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <LogoMark size={34} />
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {ad.kind === "adoption" ? "יום האימוץ" : "המודעה"} של {ad.advertiser} ב-Kami
        </h1>
        <p className="text-muted">
          {WHERE[ad.placement]}
          {ad.first_day && ad.last_day && ` · ${shortDate(ad.first_day)}–${shortDate(ad.last_day)} (${ad.day_count} ימים)`}
        </p>
      </header>
      <DevicePreview src={`/preview-frame/ad/${token}`} className="w-full" maxHeight={760} />
      <p className="max-w-md text-center text-xs text-muted">
        זו תצוגה מקדימה. באתר עצמו המודעה מתחלפת עם עד שתי מודעות נוספות, והעסקים המוצגים משתנים.
      </p>
    </main>
  );
}
