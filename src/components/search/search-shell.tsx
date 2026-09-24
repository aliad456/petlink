"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useTransition, type ReactNode } from "react";
import { cn } from "@/components/ui";

type Ctx = { pending: boolean; update: (mutate: (p: URLSearchParams) => void) => void };
const SearchCtx = createContext<Ctx>({ pending: false, update: () => {} });

export const useSearchNav = () => useContext(SearchCtx);

// Holds the URL-updating transition so the filter bar and the results
// (server-rendered) can share its pending state.
export function SearchShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const update = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      next.delete("n");
      const qs = next.toString();
      start(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  return <SearchCtx.Provider value={{ pending, update }}>{children}</SearchCtx.Provider>;
}

export function ResultsFrame({ children }: { children: ReactNode }) {
  const { pending } = useSearchNav();
  return (
    <div
      aria-busy={pending}
      className={cn("transition-[opacity,filter] duration-300", pending && "pointer-events-none opacity-50 blur-[1px]")}
    >
      {children}
    </div>
  );
}
