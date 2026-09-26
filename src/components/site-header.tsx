import { ArrowLeft, LogIn, Store } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { BetaTag } from "./beta";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, cn } from "./ui";

// Top bar that scrolls away with the page (not sticky). Three columns with the
// logo in the middle: business link on the start side, account on the end side.
// The side columns are equal (1fr) so the logo stays centred.
export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const firstName = profile?.full_name.trim().split(/\s+/)[0];

  return (
    <header style={{ viewTransitionName: "app-chrome" }} className="relative z-10 w-full">
      <div className="mx-auto grid h-18 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4">
        {/* ימין: לבעלי עסקים */}
        <div className="flex items-center justify-start gap-0.5">
          {!profile && (
            <Link
              href="/signup?type=business"
              transitionTypes={["nav-forward"]}
              aria-label="לבעלי עסקים"
              className="focus-ring pressable inline-flex items-center gap-1.5 rounded-xl p-2.5 text-sm font-medium text-muted transition-colors hover:bg-[var(--glass-bg)] hover:text-foreground sm:px-3 sm:py-2"
            >
              <Store className="size-[18px]" />
              <span className="hidden sm:inline">לבעלי עסקים</span>
            </Link>
          )}
          <ThemeToggle />
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
              className="focus-ring pressable flex items-center gap-2.5 rounded-2xl p-1.5 hover:bg-[var(--glass-bg)] sm:pe-3"
            >
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-[11px] text-muted">שלום{firstName ? "," : ""}</span>
                <span className="text-sm font-semibold">{firstName || "החשבון שלי"}</span>
              </span>
              <Avatar
                name={profile.full_name || profile.email || "?"}
                seed={profile.id}
                shape="square"
                className="size-9 text-sm"
              />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                transitionTypes={["nav-forward"]}
                aria-label="התחברות"
                className="focus-ring group relative inline-flex items-center rounded-xl p-2.5 text-sm font-semibold sm:px-3 sm:py-2"
              >
                <LogIn className="size-[18px] sm:hidden" />
                <span className="hidden sm:inline">התחברות</span>
                <span className="absolute inset-x-3 bottom-1 hidden h-0.5 origin-right scale-x-0 rounded-full bg-brand transition-transform duration-300 ease-out-soft group-hover:scale-x-100 sm:block" />
              </Link>
              <Link
                href="/signup"
                transitionTypes={["nav-forward"]}
                className={cn(
                  "focus-ring pressable group hidden h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white sm:inline-flex",
                  "bg-foreground dark:bg-white dark:text-[#05080b]",
                  "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_6px_16px_rgb(0_0_0/0.18)]",
                )}
              >
                הרשמה
                <ArrowLeft className="size-4 transition-transform duration-300 ease-spring group-hover:-translate-x-0.5" />
              </Link>
            </>
          )}
        </nav>
      </div>
      {/* hairline: brand color fading out toward the edges */}
      <div
        aria-hidden
        className="mx-auto h-px max-w-5xl bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--brand)_45%,transparent),transparent)]"
      />
    </header>
  );
}
