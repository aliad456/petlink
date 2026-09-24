import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "glass" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-brand-foreground bg-[linear-gradient(180deg,color-mix(in_oklab,var(--brand)_85%,white),var(--brand-strong))] " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.1),0_8px_24px_color-mix(in_oklab,var(--brand)_35%,transparent)] " +
    "hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_4px_rgb(0_0_0/0.1),0_12px_32px_color-mix(in_oklab,var(--brand)_45%,transparent)]",
  glass: "glass glass-glow text-foreground",
  ghost: "text-foreground hover:bg-[var(--glass-bg)]",
  danger:
    "glass glass-glow text-danger !bg-[color-mix(in_oklab,var(--danger)_10%,var(--glass-bg))] " +
    "!border-[color-mix(in_oklab,var(--danger)_25%,var(--glass-border))]",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-13 px-7 text-base gap-2",
  icon: "size-10 justify-center",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "pressable focus-ring relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold",
    "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
