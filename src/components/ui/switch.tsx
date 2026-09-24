"use client";

import { cn } from "./cn";

// iOS-style toggle.
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  name,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "focus-ring relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 disabled:opacity-50",
        checked
          ? "bg-brand shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)]"
          : "bg-[color-mix(in_oklab,var(--muted)_30%,transparent)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)]",
      )}
    >
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.25)] transition-[inset-inline-start] duration-400 ease-spring",
          checked ? "start-[calc(100%-1.625rem)]" : "start-0.5",
        )}
      />
    </button>
  );
}
