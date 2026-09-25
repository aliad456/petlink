import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/components/ui";
import type { SearchCategory } from "@/lib/search/load";

// Switch category without leaving the results. Location/open-now carry over;
// category-specific filters don't. Pages are prefetched so the switch is instant.
export function CategoryPills({
  categories,
  current,
  carry,
}: {
  categories: SearchCategory[];
  current: string | null;
  carry: Record<string, string>;
}) {
  const qs = new URLSearchParams(carry).toString();
  const href = (path: string) => (qs ? `${path}?${qs}` : path);
  const pill = (active: boolean) =>
    cn(
      "pressable focus-ring inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl px-3.5 text-sm font-semibold",
      active
        ? "bg-foreground text-background shadow-[0_6px_16px_rgb(0_0_0/0.15)]"
        : "text-foreground/75 hover:bg-[var(--glass-lite-bg)] hover:text-foreground",
    );

  return (
    <nav aria-label="קטגוריות" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
      <Link href={href("/search")} prefetch scroll={false} aria-current={!current ? "page" : undefined} className={pill(!current)}>
        הכול
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={href(`/${c.slug}`)}
          prefetch
          scroll={false}
          aria-current={current === c.id ? "page" : undefined}
          className={pill(current === c.id)}
        >
          <CategoryIcon name={c.icon} className="size-4" />
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
