import { Star } from "lucide-react";
import { cn } from "../ui";

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-500", className)} aria-label={`${value} מתוך 5`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-[1em]", n <= Math.round(value) ? "fill-current" : "text-[color-mix(in_oklab,var(--muted)_40%,transparent)]")}
        />
      ))}
    </span>
  );
}
