"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme, effectiveTheme, readTheme } from "@/lib/theme";
import { cn } from "./ui";

// Sun/moon button in the header: switches between light and dark. Both icons are
// rendered and CSS shows the right one, so server and client markup match.
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="מעבר בין מצב בהיר לכהה"
      title="מצב בהיר / כהה"
      onClick={() => applyTheme(effectiveTheme(readTheme()) === "dark" ? "light" : "dark")}
      className={cn(
        "focus-ring pressable inline-flex items-center justify-center rounded-xl p-2.5 text-muted transition-colors hover:bg-[var(--glass-bg)] hover:text-foreground",
        className,
      )}
    >
      <Moon className="size-[18px] dark:hidden" />
      <Sun className="hidden size-[18px] dark:block" />
    </button>
  );
}
