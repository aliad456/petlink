"use client";

import { ArrowLeft, MapPin, Search, Store, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { suggest, type Suggestion } from "@/app/search/actions";
import { CategoryIcon } from "@/components/category-icon";
import { cn, Spinner } from "@/components/ui";

// Free-text search with live suggestions (categories, cities, businesses).
// Enter goes to the results page; arrows + Enter pick a suggestion.
export function SearchBar({
  defaultValue = "",
  action = "/search",
  keep,
  size = "lg",
  autoFocus,
}: {
  defaultValue?: string;
  /** Where to submit (the current category page keeps its category). */
  action?: string;
  /** Extra query params to keep on submit (city, filters…). */
  keep?: Record<string, string>;
  size?: "lg" | "md";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [navigating, startNav] = useTransition();
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = value.trim();
    if (!q) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await suggest(q).catch(() => []);
      if (!cancelled) {
        setItems(res);
        setActive(-1);
        setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    startNav(() => router.push(href));
  };

  const submit = () => {
    if (active >= 0 && items[active]) return go(items[active].href);
    const params = new URLSearchParams(keep);
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    const qs = params.toString();
    go(`${action}${qs ? `?${qs}` : ""}`);
  };

  const shown = value.trim() ? items : [];

  return (
    <div ref={wrap} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "glass glass-glow flex items-center gap-3 rounded-full ps-5 pe-1.5 transition-shadow",
          "focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_30%,transparent),var(--glass-shadow)]",
          size === "lg" ? "h-15" : "h-13",
        )}
      >
        {loading || navigating ? (
          <Spinner className="size-5 shrink-0 text-brand" />
        ) : (
          <Search className="size-5 shrink-0 text-muted" />
        )}
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(shown.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(-1, a - 1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          type="search"
          enterKeyHint="search"
          autoFocus={autoFocus}
          placeholder="מה מחפשים? למשל: וטרינר ברמת גן"
          aria-label="חיפוש"
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="ניקוי"
            onClick={() => {
              setValue("");
              setItems([]);
            }}
            className="pressable rounded-full p-2 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        <button
          type="submit"
          aria-label="חיפוש"
          className={cn(
            "pressable focus-ring inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white shadow-[0_6px_18px_rgb(37_99_235/0.35)]",
            size === "lg" ? "size-12" : "size-10",
          )}
        >
          <ArrowLeft className="size-5" />
        </button>
      </form>

      {open && shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="animate-rise absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-[var(--glass-border)] isolate bg-[var(--background)] p-1.5 text-start shadow-[0_20px_60px_rgb(0_0_0/0.18)]"
        >
          {shown.map((s, i) => (
            <li key={`${s.kind}-${s.href}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => go(s.href)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start",
                  i === active && "bg-[var(--glass-bg-strong)]",
                )}
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
                  {s.kind === "city" ? (
                    <MapPin className="size-[18px]" />
                  ) : s.kind === "business" && !s.icon ? (
                    <Store className="size-[18px]" />
                  ) : (
                    <CategoryIcon name={s.icon ?? null} className="size-[18px]" />
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{s.label}</span>
                  {s.sub && <span className="truncate text-xs text-muted">{s.sub}</span>}
                </span>
                <span className="ms-auto text-[11px] font-medium text-muted">
                  {{ category: "קטגוריה", city: "עיר", business: "עסק", search: "חיפוש" }[s.kind]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
