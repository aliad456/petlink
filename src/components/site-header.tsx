import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { BetaTag } from "./beta";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, cn } from "./ui";

// Top bar that scrolls away with the page (not sticky). Three columns with the
// logo in the middle: business and plans links on the start side, account on the end side.
// The side columns are equal (1fr) so the logo stays centred.
const NAV_LINK =
  "focus-ring inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-[var(--glass-bg)] hover:text-foreground";

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const firstName = profile?.full_name.trim().split(/\s+/)[0];

  return (
    <header style={{ viewTransitionName: "app-chrome" }} className="relative z-10 w-full">
      <div className="mx-auto grid h-18 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        {/* ימין: מצב תצוגה וקישורים לבעלי עסקים. בטלפון — כפתור "לעסקים" אחד, השאר בפוטר. */}
        <div className="flex items-center justify-start gap-1">
          <ThemeToggle />
          <Link
            href={profile ? "/unclaimed" : "/signup?type=business"}
            transitionTypes={["nav-forward"]}
            className="focus-ring pressable inline-flex h-9 items-center rounded-full border border-[var(--border)] px-3.5 text-[13px] font-semibold text-foreground/80 hover:border-transparent hover:bg-[var(--glass-bg)] hover:text-foreground md:hidden"
          >
            לעסקים
          </Link>
          <div className="hidden items-center md:flex">
            {!profile && (
              <Link href="/signup?type=business" transitionTypes={["nav-forward"]} className={NAV_LINK}>
                לבעלי עסקים
              </Link>
            )}
            <Link href="/unclaimed" transitionTypes={["nav-forward"]} className={NAV_LINK}>
              העסק שלך כאן?
            </Link>
            <Link href="/plans" transitionTypes={["nav-forward"]} className={NAV_LINK}>
              תוכניות
            </Link>
          </div>
        </div>

        {/* אמצע: הלוגו, ותגית BETA שלא מזיזה אותו מהמרכז */}
        <div className="relative">
          <Logo />
          <BetaTag className="absolute -bottom-1 left-1/2 -translate-x-1/2" />
        </div>

        {/* שמאל: חשבון */}
        <nav className="flex items-center justify-end gap-1 sm:gap-2">
          {profile ? (
            <Link
              href="/account"
              transitionTypes={["nav-forward"]}
              className="focus-ring pressable flex items-center gap-2.5 rounded-full p-1 hover:bg-[var(--glass-bg)] sm:ps-1 sm:pe-3"
            >
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-[11px] text-muted">שלום{firstName ? "," : ""}</span>
                <span className="text-sm font-semibold">{firstName || "החשבון שלי"}</span>
              </span>
              <Avatar
                name={profile.full_name || profile.email || "?"}
                seed={profile.id}
                shape="circle"
                className="size-9 text-sm"
              />
            </Link>
          ) : (
            <>
              <Link href="/login" transitionTypes={["nav-forward"]} className={cn(NAV_LINK, "hidden sm:inline-flex")}>
                התחברות
              </Link>
              <Link
                href="/signup?src=header"
                transitionTypes={["nav-forward"]}
                className="btn-brand focus-ring pressable group inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold sm:h-10 sm:text-sm"
              >
                הרשמה
                <ArrowLeft className="hidden size-4 transition-transform duration-300 ease-spring group-hover:-translate-x-0.5 sm:block" />
              </Link>
            </>
          )}
        </nav>
      </div>
      <div aria-hidden className="mx-auto h-px max-w-5xl bg-[var(--border)]" />
    </header>
  );
}
