"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn, Spinner } from "@/components/ui";

// One search field for name, phone or email. Updates the URL (?q=) as you type,
// so results are shareable and the back button works.
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (value.trim() === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [value, params, pathname, router]);

  // "/" focuses the search, like most admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="glass glass-glow flex h-14 items-center gap-3 rounded-full ps-5 pe-2 transition-shadow focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_30%,transparent),var(--glass-shadow)]">
      {pending ? <Spinner className="size-5 text-brand" /> : <Search className="size-5 shrink-0 text-muted" />}
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="חיפוש לפי שם, טלפון או מייל"
        aria-label="חיפוש משתמשים"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="button"
        onClick={() => {
          setValue("");
          inputRef.current?.focus();
        }}
        aria-label="ניקוי החיפוש"
        className={cn(
          "pressable focus-ring rounded-full p-2 text-muted hover:bg-[var(--glass-bg)] hover:text-foreground",
          !value && "pointer-events-none opacity-0",
        )}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
