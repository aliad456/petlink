"use client";

import {
  BadgeCheck,
  CreditCard,
  Heart,
  History,
  House,
  Inbox,
  Megaphone,
  ShieldCheck,
  Star,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";
import type { NavIcon, NavItem } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  users: Users,
  store: Store,
  star: Star,
  tags: Tags,
  heart: Heart,
  megaphone: Megaphone,
  wallet: CreditCard,
  history: History,
  shield: ShieldCheck,
  claim: BadgeCheck,
  inbox: Inbox,
};

export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  // An item whose href has a query (?p=adoption) is active only when that query matches;
  // a plain item on the same path then steps aside.
  const queryMatches = (href: string) => {
    const [path, query] = href.split("?");
    if (!pathname.startsWith(path)) return false;
    return [...new URLSearchParams(query)].every(([k, v]) => search.get(k) === v);
  };
  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href.includes("?")) return queryMatches(href);
    return pathname.startsWith(href) && !items.some((i) => i.href.startsWith(`${href}?`) && queryMatches(i.href));
  };

  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] md:flex-col md:overflow-visible md:px-3 md:pb-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.href);
        const base =
          "flex items-center gap-3 whitespace-nowrap rounded-2xl px-3.5 py-2.5 text-[15px]";

        if (item.soon) {
          return (
            <span key={item.href} className={cn(base, "cursor-default text-muted/70")}>
              <Icon className="size-[18px] opacity-60" />
              {item.label}
              <span className="ms-auto rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] font-semibold">
                בקרוב
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              base,
              "pressable focus-ring font-medium",
              active
                ? "glass glass-strong font-semibold text-brand-strong dark:text-brand"
                : "text-foreground/80 hover:bg-[var(--glass-bg)] hover:text-foreground",
            )}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
