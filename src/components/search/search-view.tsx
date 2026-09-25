import { SearchX, Store } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { AdBanner, type BannerAd } from "@/components/ads/ad-banner";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, Card } from "@/components/ui";
import { first, PAGE, type RawParams } from "@/lib/search/params";
import type { SearchState } from "@/lib/search/load";
import { CategoryPills } from "./category-pills";
import { FilterBar } from "./filter-bar";
import { ResultCard } from "./result-card";
import { SearchBar } from "./search-bar";
import { ResultsFrame, SearchShell } from "./search-shell";

// Ads between the result cards: after the 6th card (or the last, for short lists).
const AD_AFTER = 6;

export function SearchView({
  state,
  params,
  basePath,
  topAds = [],
  inlineAds = [],
  preview = false,
}: {
  state: SearchState;
  params: RawParams;
  basePath: string;
  topAds?: BannerAd[];
  inlineAds?: BannerAd[];
  preview?: boolean;
}) {
  const { category, city, near, results, total } = state;
  const title = category ? category.name : state.q ? `תוצאות עבור „${state.q}”` : "כל השירותים";
  const where = city ? ` ב${city.name} והסביבה` : near ? " קרוב אליך" : "";

  // Params the search box should keep when resubmitting.
  const keep = Object.fromEntries(
    Object.entries(params)
      .map(([k, v]) => [k, first(v)] as const)
      .filter((e): e is [string, string] => !!e[1] && e[0] !== "q" && e[0] !== "n"),
  );
  const moreHref = (() => {
    const p = new URLSearchParams(keep);
    if (state.q) p.set("q", state.q);
    p.set("n", String(state.n + PAGE));
    return `${basePath}?${p}`;
  })();

  return (
    <>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 pb-16 pt-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
            <p className="text-muted">
              {total > 0 ? `${total.toLocaleString("he-IL")} ${total === 1 ? "עסק" : "עסקים"}${where}` : `אין תוצאות${where}`}
            </p>
          </header>

          {topAds.length > 0 && <AdBanner ads={topAds} preview={preview} />}

          <CategoryPills
            categories={state.categories}
            current={category?.id ?? null}
            carry={Object.fromEntries(Object.entries(keep).filter(([k]) => ["city", "near", "open"].includes(k)))}
          />

          <SearchBar
            key={`${basePath}?${state.q}`}
            defaultValue={state.q}
            action={basePath}
            keep={keep}
            size="md"
          />

          <SearchShell>
            <FilterBar
              filters={state.relevant}
              cities={state.cities.map((c) => c.name)}
              city={city?.name ?? null}
              near={!!near}
              nearRequested={first(params.near) === "me"}
              openNow={state.openNow}
              active={state.active}
            />

            <ResultsFrame>
              {results.length === 0 ? (
                <Card className="flex flex-col items-center gap-3 py-14 text-center">
                  <SearchX className="size-10 text-muted" />
                  <p className="text-lg font-bold">עוד לא מצאנו עסק שמתאים</p>
                  <p className="max-w-sm text-sm text-muted">
                    נסו להסיר חלק מהסינונים או לחפש בעיר אחרת. אנחנו מוסיפים עסקים כל יום.
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <Link href={basePath} className={buttonClass({ variant: "glass", size: "sm" })}>
                      בלי סינונים
                    </Link>
                    <Link href="/signup?type=business" className={buttonClass({ size: "sm" })}>
                      <Store className="size-4" />
                      יש לכם עסק? הצטרפו
                    </Link>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((r, i) => (
                      <Fragment key={r.id}>
                        <ResultCard r={r} index={i} />
                        {inlineAds.length > 0 && results.length >= 3 && i === Math.min(AD_AFTER, results.length) - 1 && (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <AdBanner ads={inlineAds} preview={preview} />
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                  {total > results.length && (
                    <Link href={moreHref} scroll={false} className={buttonClass({ variant: "glass", className: "self-center" })}>
                      הצגת עוד ({total - results.length})
                    </Link>
                  )}
                </div>
              )}
            </ResultsFrame>
          </SearchShell>
        </main>
      </PageTransition>
    </>
  );
}
