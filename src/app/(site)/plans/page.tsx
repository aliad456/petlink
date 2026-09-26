import { Check, PawPrint, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MaintenanceNotice, MaintenanceScreen } from "@/components/maintenance";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, cn } from "@/components/ui";
import { getOwnBusiness } from "@/lib/business/own";
import { maintenanceGate } from "@/lib/maintenance";
import { FOUNDERS_NOTE, PLANS, type Plan } from "@/lib/plans";
import { WaitlistButton } from "./waitlist-button";

export const metadata: Metadata = {
  title: "תוכניות לעסקים",
  description: "תוכניות Kami לעסקים לחיות מחמד: עדיפות בחיפוש, עיצובים מתקדמים וסטטיסטיקות. לבעלי חיות, Kami חינמי.",
};

// Plans and prices for businesses. Starts in maintenance mode (only staff see it)
// until billing launches; opened from the admin panel.
export default async function PlansPage() {
  const gate = await maintenanceGate("/plans");
  if (gate === "closed") return <MaintenanceScreen />;
  const business = await getOwnBusiness();

  return (
    <PageTransition>
      {gate === "preview" && <MaintenanceNotice />}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-16 pt-10 sm:pt-14">
        <header className="animate-rise flex flex-col items-center gap-3 text-center">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-brand-strong dark:text-brand">
            <Sparkles className="size-3.5" />
            Kami לעסקים
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            יותר לקוחות, <span className="text-kami">בלי להתאמץ</span>
          </h1>
          <p className="max-w-xl text-balance text-muted">
            עמוד העסק ב-Kami חינמי ותמיד יישאר חינמי. התוכניות מוסיפות עדיפות בחיפוש, עיצובים מתקדמים וסטטיסטיקות שמראות
            כמה לקוחות הגיעו אליכם.
          </p>
        </header>

        <ul className="grid items-stretch gap-4 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <PlanCard key={p.key} plan={p} index={i} hasBusiness={!!business} joined={!!business?.pro_waitlist_at} />
          ))}
        </ul>

        <div className="animate-rise flex flex-col items-center gap-3 text-center" style={{ "--i": 4 } as CSSProperties}>
          <p className="glass-lite rounded-2xl px-4 py-3 text-sm font-medium">{FOUNDERS_NOTE}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <PawPrint className="size-4" />
            בעלי חיות מחמד? Kami חינמי בשבילכם, בלי מנוי.
          </p>
          <p className="text-xs text-muted">המחירים לחודש, בלי התחייבות. התוכניות עדיין לא זמינות לרכישה.</p>
        </div>
      </main>
    </PageTransition>
  );
}

function PlanCard({ plan, index, hasBusiness, joined }: { plan: Plan; index: number; hasBusiness: boolean; joined: boolean }) {
  const featured = !!plan.highlight;
  return (
    <li
      className={cn(
        "animate-rise relative flex flex-col gap-5 rounded-[1.75rem] p-6",
        featured ? "glass glass-strong ring-2 ring-[color-mix(in_oklab,var(--brand)_55%,transparent)]" : "glass-lite",
      )}
      style={{ "--i": index + 1 } as CSSProperties}
    >
      {plan.highlight && (
        <span className="absolute -top-3 start-6 rounded-full bg-kami px-3 py-1 text-xs font-bold text-white shadow-md">
          {plan.highlight}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight" dir="ltr" style={{ textAlign: "right" }}>
          {plan.name}
        </h2>
        <p className="text-sm text-muted">{plan.audience}</p>
      </div>

      {/* The price stays modest; the plan name and what you get lead. */}
      <div className="flex flex-col gap-1">
        {plan.price !== null ? (
          <p className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">{plan.price.toFixed(2)}</span>
            <span className="text-base font-semibold">₪</span>
            <span className="text-sm text-muted">לחודש</span>
          </p>
        ) : (
          <p className="text-xl font-bold">הצעת מחיר אישית</p>
        )}
        {plan.intro && <p className="text-xs font-semibold text-success">{plan.intro}</p>}
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2 text-sm leading-snug">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" />
            {f}
          </li>
        ))}
      </ul>

      {plan.cta.href ? (
        <Link href={plan.cta.href} className={buttonClass({ variant: "glass", className: "w-full" })}>
          {plan.cta.label}
        </Link>
      ) : hasBusiness ? (
        <WaitlistButton joined={joined} label={plan.cta.label} primary={featured} />
      ) : (
        <Link
          href="/business/new"
          className={buttonClass({ variant: featured ? "primary" : "glass", className: "w-full" })}
        >
          פתחו עמוד עסק בחינם
        </Link>
      )}
    </li>
  );
}
