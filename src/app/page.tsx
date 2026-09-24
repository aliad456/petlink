import { Search, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { PageTransition } from "@/components/page-transition";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

type Category = { id: string; slug: string; name: string; icon: string | null };
type Filter = { id: string; key: string; name: string };

// Tints cycle through the category tiles so the grid doesn't read as one flat block.
const TINTS = [
  "from-teal-400/25 to-cyan-400/10 text-teal-700 dark:text-teal-300",
  "from-sky-400/25 to-indigo-400/10 text-sky-700 dark:text-sky-300",
  "from-amber-400/25 to-orange-400/10 text-amber-700 dark:text-amber-300",
  "from-violet-400/25 to-fuchsia-400/10 text-violet-700 dark:text-violet-300",
  "from-rose-400/25 to-pink-400/10 text-rose-700 dark:text-rose-300",
];

export default async function HomePage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: filters }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, name, icon")
      .order("sort_order")
      .returns<Category[]>(),
    supabase
      .from("filters")
      .select("id, key, name")
      .eq("is_featured", true)
      .order("sort_order")
      .returns<Filter[]>(),
  ]);

  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-16 pt-10 sm:pt-16">
          <section className="flex flex-col items-center gap-5 text-center">
            <span className="glass animate-rise inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-brand-strong dark:text-brand">
              <Sparkles className="size-3.5" />
              המדריך לחיות מחמד בישראל
            </span>
            <h1
              className="animate-rise max-w-2xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
              style={{ "--i": 1 } as CSSProperties}
            >
              כל השירותים לחיית המחמד שלך,{" "}
              <span className="bg-gradient-to-l from-teal-500 to-cyan-600 bg-clip-text text-transparent dark:from-teal-300 dark:to-cyan-400">
                במקום אחד
              </span>
            </h1>
            <p
              className="animate-rise max-w-xl text-balance text-lg text-muted"
              style={{ "--i": 2 } as CSSProperties}
            >
              וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ — עם פילטרים שגוגל מפות לא נותן.
            </p>

            {/* Search arrives in phase 4; the bar is here so the layout is final. */}
            <div
              className="glass glass-glow animate-rise mt-2 flex h-15 w-full max-w-xl items-center gap-3 rounded-full ps-5 pe-2 text-start"
              style={{ "--i": 3 } as CSSProperties}
            >
              <Search className="size-5 shrink-0 text-muted" />
              <span className="flex-1 text-muted">מה מחפשים? וטרינר, מאלף, ספר…</span>
              <span className="rounded-full bg-[var(--glass-bg)] px-3 py-1.5 text-xs font-semibold text-muted">
                בקרוב
              </span>
            </div>

            <ul
              className="animate-rise flex flex-wrap justify-center gap-2"
              style={{ "--i": 4 } as CSSProperties}
            >
              {filters?.map((f) => (
                <li
                  key={f.id}
                  className="glass rounded-full px-3.5 py-1.5 text-sm font-medium"
                >
                  {f.name}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
            <h2 id="categories-heading" className="text-xl font-bold">
              קטגוריות
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories?.map((c, i) => (
                <li
                  key={c.id}
                  className="animate-rise"
                  style={{ "--i": i + 5 } as CSSProperties}
                >
                  <div className="glass glass-glow pressable flex h-full flex-col items-start gap-4 rounded-[1.75rem] p-5">
                    <span
                      className={`inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${TINTS[i % TINTS.length]}`}
                    >
                      <CategoryIcon name={c.icon} className="size-6" />
                    </span>
                    <span className="font-semibold leading-snug">{c.name}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
