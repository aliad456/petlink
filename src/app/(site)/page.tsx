import { ArrowLeft, Clock, Navigation, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { PageTransition } from "@/components/page-transition";
import { ResultCard } from "@/components/search/result-card";
import { SearchBar } from "@/components/search/search-bar";
import { getFreshBusinesses } from "@/lib/catalog";
import { loadSearchContext } from "@/lib/search/load";

// Tints cycle through the category tiles so the grid doesn't read as one flat block.
const TINTS = [
  "from-cyan-400/25 to-blue-400/10 text-cyan-700 dark:text-cyan-300",
  "from-sky-400/25 to-indigo-400/10 text-sky-700 dark:text-sky-300",
  "from-amber-400/25 to-orange-400/10 text-amber-700 dark:text-amber-300",
  "from-violet-400/25 to-fuchsia-400/10 text-violet-700 dark:text-violet-300",
  "from-rose-400/25 to-pink-400/10 text-rose-700 dark:text-rose-300",
  "from-green-400/25 to-emerald-400/10 text-green-700 dark:text-green-300",
];

type Featured = { id: string; key: string; name: string; kind: string };

function filterHref(f: Featured) {
  if (f.kind === "open_now") return "/search?open=1";
  if (f.kind === "distance") return "/search?near=me";
  return `/search?${f.key}=1`;
}

export default async function HomePage() {
  const [{ categories, filters }, businesses] = await Promise.all([
    loadSearchContext(),
    getFreshBusinesses().catch(() => []),
  ]);
  const featured: Featured[] = filters.filter((f) => f.is_featured);

  return (
    <>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 pb-16 pt-10 sm:pt-16">
          <section className="flex flex-col items-center gap-5 text-center">
            <span className="glass animate-rise inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-brand-strong dark:text-brand">
              <Sparkles className="size-3.5" />
              המדריך לחיות מחמד בישראל
            </span>
            <h1
              className="animate-rise max-w-2xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl"
              style={{ "--i": 1 } as CSSProperties}
            >
              כל השירותים לחיית המחמד שלך, <span className="text-kami">במקום אחד</span>
            </h1>
            <p className="animate-rise max-w-xl text-balance text-lg text-muted" style={{ "--i": 2 } as CSSProperties}>
              וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ — עם פילטרים שגוגל מפות לא נותן.
            </p>

            <div className="animate-rise relative z-20 mt-2 w-full max-w-xl" style={{ "--i": 3 } as CSSProperties}>
              <SearchBar />
            </div>

            <ul className="animate-rise flex flex-wrap justify-center gap-2" style={{ "--i": 4 } as CSSProperties}>
              {featured?.map((f) => (
                <li key={f.id}>
                  <Link
                    href={filterHref(f)}
                    className="pressable focus-ring glass-lite inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium"
                  >
                    {f.kind === "open_now" && <Clock className="size-3.5 text-success" />}
                    {f.kind === "distance" && <Navigation className="size-3.5 text-brand" />}
                    {f.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
            <h2 id="categories-heading" className="text-xl font-bold">
              קטגוריות
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {categories.map((c, i) => (
                <li key={c.id} className="animate-rise" style={{ "--i": i + 5 } as CSSProperties}>
                  <Link
                    href={`/${c.slug}`}
                    prefetch
                    transitionTypes={["nav-forward"]}
                    className="focus-ring glass-lite glass-glow pressable group flex h-full flex-col items-start gap-4 rounded-[1.75rem] p-5"
                  >
                    <span
                      className={`inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${TINTS[i % TINTS.length]}`}
                    >
                      <CategoryIcon name={c.icon} className="size-6" />
                    </span>
                    <span className="flex w-full items-end justify-between gap-2 font-semibold leading-snug">
                      {c.name}
                      <ArrowLeft className="size-4 shrink-0 text-muted transition-transform duration-300 ease-spring group-hover:-translate-x-1" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {businesses.length > 0 && (
            <section aria-labelledby="new-heading" className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <h2 id="new-heading" className="text-xl font-bold">
                  חדשים ב-Kami
                </h2>
                <Link href="/search" className="text-sm font-semibold text-brand-strong hover:underline dark:text-brand">
                  לכל העסקים
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((r, i) => (
                  <ResultCard key={r.id} r={r} index={i} />
                ))}
              </div>
            </section>
          )}
        </main>
      </PageTransition>
    </>
  );
}
