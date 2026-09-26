import { Construction, House, Search } from "lucide-react";
import Image from "next/image";
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
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-4 pb-16 pt-10 text-center">
        <Image
          src="/images/maintenance.webp"
          alt="כלב, חתול וארנב בקסדות ובאפודים כתומים מאחורי שלט: 404, העמוד כרגע בשיפוץ"
          width={1254}
          height={992}
          priority
          sizes="(max-width: 640px) calc(100vw - 2rem), 36rem"
          className="animate-rise h-auto w-full rounded-[2rem] shadow-[0_20px_50px_rgb(15_23_42/0.18)] ring-1 ring-black/5 dark:ring-white/10"
        />

        <div className="animate-rise flex flex-col gap-2" style={{ "--i": 1 } as CSSProperties}>
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
