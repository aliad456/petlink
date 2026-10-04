"use client";

import { House, LogIn, Search, Tag, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

// App-style tab bar at the bottom of the screen, on phones only. Hidden from md up
// (the header has these links) and in the iPhone app, which has a native tab bar
// (html.kami-ios, ios/Kami/WebViewController.swift — keep the two in sync).
// Floating elements make room for it through --bottom-nav (globals.css).

type Tab = { href: string; label: string; icon: typeof House; active: (path: string) => boolean };

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const tabs: Tab[] = [
    { href: "/", label: "בית", icon: House, active: (p) => p === "/" },
    { href: "/search", label: "חיפוש", icon: Search, active: (p) => p.startsWith("/search") },
    { href: "/deals", label: "מבצעים", icon: Tag, active: (p) => p.startsWith("/deals") },
    signedIn
      ? { href: "/account", label: "החשבון שלי", icon: UserRound, active: (p) => p.startsWith("/account") || p.startsWith("/business") }
      : { href: "/login", label: "כניסה", icon: LogIn, active: () => false },
  ];

  return (
    <nav
      aria-label="ניווט ראשי"
      data-bottom-nav
      className="fixed inset-x-3 bg-[color-mix(in_oklab,var(--background)_95%,transparent)] backdrop-blur-xl bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] mx-auto flex h-16 max-w-md items-stretch justify-around rounded-[1.75rem] border border-[var(--glass-border)] px-1.5 shadow-[0_10px_30px_rgb(15_23_42/0.14)] md:hidden print:hidden"
    >
      {tabs.map((t) => {
        const on = t.active(path);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch
            aria-current={on ? "page" : undefined}
            className="focus-ring pressable group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl"
          >
            <span
              className={cn(
                "inline-flex h-8 w-12 items-center justify-center rounded-xl transition-[background,color,box-shadow] duration-300",
                on
                  ? "bg-[linear-gradient(135deg,#4ade80,#22d3ee_50%,#3b82f6)] text-white shadow-[0_4px_12px_rgb(34_211_238/0.4)]"
                  : "text-muted group-hover:text-foreground",
              )}
            >
              <Icon className="size-[19px]" strokeWidth={on ? 2.4 : 2} />
            </span>
            <span className={cn("truncate text-[10.5px] font-semibold", on ? "text-foreground" : "text-muted")}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
