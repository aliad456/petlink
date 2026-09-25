import { BadgePercent } from "lucide-react";
import type { Metadata } from "next";
import { DealCard } from "@/components/deal-card";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";
import { getDeals } from "@/lib/deals";

export const metadata: Metadata = {
  title: "מבצעים",
  description: "כל המבצעים של עסקים לחיות מחמד ב-Kami: וטרינרים, מאלפים, ספרים וחנויות.",
};

export default async function DealsPage() {
  const deals = await getDeals(60);
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-16 pt-8">
        <header className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <BadgePercent className="size-8 text-orange-500" />
            מבצעים
          </h1>
          <p className="text-muted">מבצעים שעסקים פרסמו ב-Kami. הם מתעדכנים כל הזמן.</p>
        </header>
        {deals.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <BadgePercent className="size-10 text-muted" />
            <p className="font-semibold">אין מבצעים כרגע</p>
            <p className="text-sm text-muted">בעלי עסקים מוסיפים מבצעים מעורך העמוד שלהם.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d, i) => (
              <DealCard key={d.id} deal={d} index={i} />
            ))}
          </div>
        )}
      </main>
    </PageTransition>
  );
}
