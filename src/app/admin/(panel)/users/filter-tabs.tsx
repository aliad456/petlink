import Link from "next/link";
import { cn } from "@/components/ui";

export type Tab = { value: string | null; label: string };

// Segmented control rendered as links, so filters live in the URL.
export function FilterTabs({
  tabs,
  param,
  current,
  searchParams,
  size = "md",
}: {
  tabs: Tab[];
  param: string;
  current: string | null;
  searchParams: Record<string, string | undefined>;
  size?: "sm" | "md";
}) {
  const hrefFor = (value: string | null) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== param && k !== "page") next.set(k, v);
    }
    if (value) next.set(param, value);
    const qs = next.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <div
      role="tablist"
      className={cn(
        "glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]",
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === current;
        return (
          <Link
            key={tab.label}
            role="tab"
            aria-selected={active}
            href={hrefFor(tab.value)}
            replace
            scroll={false}
            className={cn(
              "pressable focus-ring whitespace-nowrap rounded-full font-medium",
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2 text-sm",
              active
                ? "bg-[var(--glass-bg-strong)] font-semibold text-foreground shadow-[inset_0_1px_0_var(--glass-highlight),0_2px_8px_rgb(0_0_0/0.08)]"
                : "text-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
