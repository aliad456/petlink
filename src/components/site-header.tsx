import { UserRound } from "lucide-react";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { Logo } from "./logo";
import { buttonClass } from "./ui";

// Floating glass bar. Named for view transitions so it stays put while pages slide.
export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header
      style={{ viewTransitionName: "app-chrome" }}
      className="sticky top-3 z-50 mx-auto w-full max-w-5xl px-3"
    >
      <div className="glass flex h-15 items-center justify-between rounded-full ps-3 pe-2">
        <Logo />
        {profile ? (
          <Link
            href="/account"
            transitionTypes={["nav-forward"]}
            className={buttonClass({ variant: "glass", size: "sm" })}
          >
            <UserRound className="size-4" />
            החשבון שלי
          </Link>
        ) : (
          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              transitionTypes={["nav-forward"]}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              התחברות
            </Link>
            <Link
              href="/signup"
              transitionTypes={["nav-forward"]}
              className={buttonClass({ variant: "primary", size: "sm" })}
            >
              הרשמה
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
