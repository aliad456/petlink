import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

const FIELD =
  "glass focus-ring w-full rounded-2xl px-4 text-base text-foreground placeholder:text-muted/70 " +
  "transition-[box-shadow,border-color] duration-200 focus:border-[color-mix(in_oklab,var(--brand)_60%,transparent)]";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("flex flex-col gap-2 text-sm font-medium text-foreground/90", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD, "min-h-28 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "animate-rise rounded-2xl px-4 py-3 text-sm font-medium",
        error
          ? "bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-danger"
          : "bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] text-brand-strong dark:text-brand",
      )}
    >
      {error ?? message}
    </p>
  );
}

// A selectable glass tile (radio or checkbox) — used for choices like account type.
export function ChoiceTile({
  children,
  className,
  ...props
}: ComponentProps<"input"> & { children: ReactNode }) {
  return (
    <label
      className={cn(
        "glass glass-glow pressable flex cursor-pointer items-center justify-center rounded-2xl px-3 py-3.5 text-center text-sm font-medium",
        "has-[:checked]:!border-[color-mix(in_oklab,var(--brand)_55%,transparent)] has-[:checked]:!bg-[color-mix(in_oklab,var(--brand)_14%,var(--glass-bg))] has-[:checked]:font-semibold has-[:checked]:text-brand-strong dark:has-[:checked]:text-brand",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50",
        className,
      )}
    >
      <input className="sr-only" {...props} />
      {children}
    </label>
  );
}
