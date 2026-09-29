import { Star } from "lucide-react";
import type { Metadata } from "next";
import { MaintenanceGate } from "@/components/maintenance";
import { PageTransition } from "@/components/page-transition";
import { ResultCard } from "@/components/search/result-card";
import { Card } from "@/components/ui";
import { getRecommendedBusinesses } from "@/lib/catalog";
import { getFavoriteIds } from "@/lib/favorites";

export const metadata: Metadata = {
  title: "אנחנו ממליצים",
  description: "עסקים לחיות מחמד שצוות Kami בחר להמליץ עליהם: וטרינרים, ספרים, מאלפים, פנסיונים וחנויות.",
};

export default async function RecommendedPage() {
  const [businesses, favoriteIds] = await Promise.all([getRecommendedBusinesses().catch(() => []), getFavoriteIds()]);
  return (
    <MaintenanceGate path="/recommended">
      <PageTransition>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-16 pt-8">
          <header className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              <Star className="size-8 fill-amber-400 text-amber-400" />
              אנחנו ממליצים
            </h1>
            <p className="text-muted">עסקים שצוות Kami בחר להמליץ עליהם.</p>
          </header>
          {businesses.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-14 text-center">
              <Star className="size-10 text-muted" />
              <p className="font-semibold">עוד אין כאן עסקים</p>
              <p className="text-sm text-muted">בקרוב נוסיף את העסקים שאנחנו ממליצים עליהם.</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((r, i) => (
                <ResultCard key={r.id} r={r} index={i} saved={favoriteIds ? favoriteIds.includes(r.id) : null} />
              ))}
            </div>
          )}
        </main>
      </PageTransition>
    </MaintenanceGate>
  );
}
