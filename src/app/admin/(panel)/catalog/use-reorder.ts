"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "@/components/toast";
import type { ActionResult } from "./actions";

// Optimistic reordering: the list moves immediately (inside a transition, so
// <ViewTransition> animates it) and snaps back if the server rejects it.
export function useReorder<T extends { id: string }>(
  items: T[],
  save: (ids: string[]) => Promise<ActionResult>,
) {
  const [optimistic, setOptimistic] = useOptimistic(items);
  const [pending, startTransition] = useTransition();

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= optimistic.length) return;
    const next = [...optimistic];
    [next[index], next[target]] = [next[target], next[index]];

    startTransition(async () => {
      setOptimistic(next);
      const result = await save(next.map((i) => i.id));
      if (result.error) toast.error(result.error);
    });
  };

  return { items: optimistic, move, pending };
}
