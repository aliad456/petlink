import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "success" | "warning" | "danger" | "brand" | "neutral";

const TONES: Record<Tone, string> = {
  success: "text-success bg-[color-mix(in_oklab,var(--success)_14%,transparent)]",
  warning: "text-warning bg-[color-mix(in_oklab,var(--warning)_16%,transparent)]",
  danger: "text-danger bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]",
  brand: "text-brand-strong dark:text-brand bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]",
  neutral: "text-muted bg-[color-mix(in_oklab,var(--muted)_14%,transparent)]",
};

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
      {children}
    </span>
  );
}

export type { Tone };
