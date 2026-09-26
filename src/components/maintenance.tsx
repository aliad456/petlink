import { Construction, House, Search } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { buttonClass } from "@/components/ui";
import { maintenanceGate } from "@/lib/maintenance";

// What visitors see on a page in maintenance mode (see src/lib/maintenance.ts).
export function MaintenanceScreen({ home = true }: { home?: boolean }) {
  return (
    <PageTransition>
      {/* A temporary screen: keep it out of search results. React hoists this into <head>. */}
      <meta name="robots" content="noindex" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-4 pb-16 pt-10 text-center">
        <div className="glass animate-rise relative w-full overflow-hidden rounded-[2rem]">
          <div aria-hidden className="h-3 bg-[repeating-linear-gradient(-45deg,#f97316_0_14px,#1f2937_14px_28px)]" />
          <CrewIllustration className="mx-auto mt-4 w-full max-w-[22rem]" />
          <div aria-hidden className="h-3 bg-[repeating-linear-gradient(-45deg,#f97316_0_14px,#1f2937_14px_28px)]" />
        </div>

        <div className="animate-rise flex flex-col gap-2" style={{ "--i": 1 } as CSSProperties}>
          <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
            <Construction className="size-3.5" />
            הדף בשיפוצים
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">בקרוב חוזרים!</h1>
          <p className="text-balance text-muted">
            הצוות שלנו, כולל העוזרים על ארבע, עובד על הדף הזה כדי שיהיה עוד יותר טוב. חזרו לבדוק בעוד קצת.
          </p>
        </div>

        <div className="animate-rise flex flex-wrap justify-center gap-2.5" style={{ "--i": 2 } as CSSProperties}>
          {home && (
            <Link href="/" transitionTypes={["nav-back"]} className={buttonClass({ variant: "primary" })}>
              <House className="size-4" />
              לדף הבית
            </Link>
          )}
          <Link href="/search" className={buttonClass({ variant: "glass" })}>
            <Search className="size-4" />
            חיפוש שירותים
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}

// Staff looking at a closed page: a reminder that visitors see the maintenance screen.
export function MaintenanceNotice() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-[repeating-linear-gradient(-45deg,#f97316_0_14px,#ea580c_14px_28px)] px-4 py-2 text-center text-sm font-semibold text-white shadow-md">
      <Construction className="size-4 shrink-0" />
      <span>
        מצב תחזוקה: הדף סגור לגולשים, רק צוות רואה אותו.{" "}
        <Link href="/admin/catalog?tab=maintenance" className="underline underline-offset-2">
          ניהול
        </Link>
      </span>
    </div>
  );
}

// A dog in a hard hat with a wrench, a cat in safety goggles, and a traffic cone,
// both in orange hi-vis vests. Flat colours that read on light and dark glass.
function CrewIllustration({ className }: { className?: string }) {
  const vest = "#f97316";
  const stripe = "#fde68a";
  const ink = "#1f2937";
  return (
    <svg viewBox="0 0 320 200" className={className} role="img" aria-label="כלב וחתול במדי עבודה כתומים מתקנים את הדף">
      {/* ground */}
      <ellipse cx="160" cy="186" rx="140" ry="9" fill="currentColor" opacity="0.08" />

      {/* traffic cone */}
      <g transform="translate(262 112)">
        <path d="M18 0 L34 70 H2 Z" fill={vest} />
        <path d="M11.5 28 H24.5 L27 40 H9 Z" fill="#fff" />
        <path d="M7 52 H29 L31 60 H5 Z" fill="#fff" />
        <rect x="-4" y="68" width="44" height="7" rx="3" fill={ink} />
      </g>

      {/* dog */}
      <g transform="translate(40 34)">
        {/* body + vest */}
        <rect x="18" y="86" width="84" height="66" rx="28" fill="#c98b4f" />
        <path d="M24 100 Q60 86 96 100 V140 Q60 156 24 140 Z" fill={vest} />
        <path d="M60 92 L50 110 M60 92 L70 110" stroke="#c98b4f" strokeWidth="7" strokeLinecap="round" />
        <rect x="26" y="120" width="68" height="6" rx="3" fill={stripe} />
        {/* wrench in paw */}
        <g className="origin-[104px_112px] motion-safe:animate-[kami-wiggle_1.6s_ease-in-out_infinite]">
          <rect x="100" y="84" width="8" height="40" rx="4" fill="#9ca3af" transform="rotate(28 104 104)" />
          <path d="M112 76 a10 10 0 1 1 -6 18 l6 -8 z" fill="#9ca3af" transform="rotate(28 104 104)" />
          <circle cx="102" cy="114" r="9" fill="#c98b4f" />
        </g>
        {/* ears */}
        <ellipse cx="26" cy="56" rx="13" ry="26" fill="#8b5a2b" transform="rotate(18 26 56)" />
        <ellipse cx="94" cy="56" rx="13" ry="26" fill="#8b5a2b" transform="rotate(-18 94 56)" />
        {/* head */}
        <circle cx="60" cy="56" r="36" fill="#d9a066" />
        <ellipse cx="60" cy="72" rx="20" ry="15" fill="#f3d3a8" />
        <circle cx="47" cy="52" r="4.5" fill={ink} />
        <circle cx="73" cy="52" r="4.5" fill={ink} />
        <circle cx="48.5" cy="50.5" r="1.4" fill="#fff" />
        <circle cx="74.5" cy="50.5" r="1.4" fill="#fff" />
        <ellipse cx="60" cy="66" rx="7" ry="5" fill={ink} />
        <path d="M52 76 Q60 83 68 76" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M60 71 V76" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
        {/* hard hat */}
        <g className="motion-safe:animate-[kami-bob_2.4s_ease-in-out_infinite]">
          <path d="M30 32 Q30 6 60 6 Q90 6 90 32 Z" fill="#fbbf24" />
          <rect x="22" y="29" width="76" height="9" rx="4.5" fill="#f59e0b" />
          <rect x="56" y="6" width="8" height="24" rx="3" fill="#f59e0b" />
        </g>
      </g>

      {/* cat */}
      <g transform="translate(168 62)">
        <rect x="14" y="68" width="68" height="56" rx="24" fill="#6b7280" />
        <path d="M18 80 Q48 68 78 80 V112 Q48 126 18 112 Z" fill={vest} />
        <path d="M48 74 L40 90 M48 74 L56 90" stroke="#6b7280" strokeWidth="6" strokeLinecap="round" />
        <rect x="20" y="98" width="56" height="5" rx="2.5" fill={stripe} />
        {/* tail */}
        <path d="M80 110 Q106 104 98 78" stroke="#6b7280" strokeWidth="9" fill="none" strokeLinecap="round" />
        {/* head */}
        <path d="M22 26 L26 0 L42 16 Z" fill="#6b7280" />
        <path d="M74 26 L70 0 L54 16 Z" fill="#6b7280" />
        <path d="M27 20 L28 8 L37 16 Z" fill="#f9a8d4" />
        <path d="M69 20 L68 8 L59 16 Z" fill="#f9a8d4" />
        <circle cx="48" cy="40" r="28" fill="#9ca3af" />
        <ellipse cx="38" cy="38" rx="4" ry="5" fill={ink} />
        <ellipse cx="58" cy="38" rx="4" ry="5" fill={ink} />
        <circle cx="39.3" cy="36.5" r="1.3" fill="#fff" />
        <circle cx="59.3" cy="36.5" r="1.3" fill="#fff" />
        <path d="M45 48 H51 L48 51 Z" fill="#f472b6" />
        <path d="M42 54 Q45 57 48 54 Q51 57 54 54" stroke={ink} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M22 46 H34 M22 52 L34 50 M62 46 H74 M62 50 L74 52" stroke={ink} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        {/* safety goggles on the forehead */}
        <rect x="28" y="16" width="40" height="9" rx="4.5" fill="#38bdf8" opacity="0.9" />
        <rect x="26" y="18.5" width="44" height="4" rx="2" fill={ink} opacity="0.5" />
      </g>
    </svg>
  );
}

// Wraps a page: visitors get the maintenance screen while the page is closed,
// staff with site.maintenance get the page plus a reminder strip.
export async function MaintenanceGate({ path, children }: { path: string; children: ReactNode }) {
  const gate = await maintenanceGate(path);
  if (gate === "closed") return <MaintenanceScreen home={path !== "/"} />;
  return (
    <>
      {gate === "preview" && <MaintenanceNotice />}
      {children}
    </>
  );
}
