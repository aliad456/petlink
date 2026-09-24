import { ArrowLeft, Store } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { Logo } from "./logo";
import { Avatar, cn } from "./ui";

// Top bar that scrolls away with the page (not sticky). Rounded-square
// controls rather than pills, and a brand hairline instead of a floating card.
export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const firstName = profile?.full_name.trim().split(/\s+/)[0];

  return (
    <header style={{ viewTransitionName: "app-chrome" }} className="relative z-10 w-full">
      <div className="mx-auto flex h-18 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />

        <nav className="flex items-center gap-1 sm:gap-2">
          {!profile && (
            <Link
              href="/signup?type=business"
              transitionTypes={["nav-forward"]}
              className="focus-ring hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:inline-flex"
            >
              <Store className="size-4" />
              לבעלי עסקים
            </Link>
          )}

          {profile ? (
            <Link
              href="/account"
              transitionTypes={["nav-forward"]}
              className="focus-ring pressable flex items-center gap-2.5 rounded-2xl py-1.5 ps-1.5 pe-3 hover:bg-[var(--glass-bg)]"
            >
              <Avatar
                name={profile.full_name || profile.email || "?"}
                seed={profile.id}
                shape="square"
                className="size-9 text-sm"
              />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] text-muted">שלום{firstName ? "," : ""}</span>
                <span className="text-sm font-semibold">{firstName || "החשבון שלי"}</span>
              </span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                transitionTypes={["nav-forward"]}
                className="focus-ring group relative rounded-xl px-3 py-2 text-sm font-semibold"
              >
                התחברות
                <span className="absolute inset-x-3 bottom-1 h-0.5 origin-right scale-x-0 rounded-full bg-brand transition-transform duration-300 ease-out-soft group-hover:scale-x-100" />
              </Link>
              <Link
                href="/signup"
                transitionTypes={["nav-forward"]}
                className={cn(
                  "focus-ring pressable group inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white",
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
