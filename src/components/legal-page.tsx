import type { CSSProperties, ReactNode } from "react";
import { LEGAL_UPDATED } from "@/lib/legal";
import { PageTransition } from "./page-transition";

export type LegalSection = { id: string; title: string; body: ReactNode };

// Long-form legal document: title, "last updated", a table of contents and
// numbered sections. Plain `glass-lite` surfaces (these pages are long).
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-8">
        <header className="animate-rise flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-sm text-muted">עודכן לאחרונה: {LEGAL_UPDATED}</p>
        </header>

        <div className="glass-lite animate-rise rounded-3xl p-5 text-[15px] leading-relaxed sm:p-7" style={{ "--i": 1 } as CSSProperties}>
          <div className="legal-prose flex flex-col gap-3">{intro}</div>
        </div>

        <nav
          aria-label="תוכן העניינים"
          className="glass-lite animate-rise rounded-3xl p-5 sm:p-7"
          style={{ "--i": 2 } as CSSProperties}
        >
          <h2 className="mb-3 text-sm font-bold text-muted">תוכן העניינים</h2>
          <ol className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="focus-ring rounded hover:text-brand-strong dark:hover:text-brand">
                  <span className="tabular-nums text-muted">{i + 1}.</span> {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="glass-lite scroll-mt-6 rounded-3xl p-5 sm:p-7">
            <h2 className="mb-3 text-xl font-bold tracking-tight">
              <span className="tabular-nums text-brand">{i + 1}.</span> {s.title}
            </h2>
            <div className="legal-prose flex flex-col gap-3 text-[15px] leading-relaxed">{s.body}</div>
          </section>
        ))}
      </main>
    </PageTransition>
  );
}
