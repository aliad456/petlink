"use client";

import { FlaskConical, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BETA_COOKIE } from "@/lib/site";
import { cn } from "./ui";

// Small "BETA" tag. Sits next to the logo without touching the artwork.
export function BetaTag({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn(
        "pointer-events-none inline-flex select-none items-center rounded-full px-1.5 py-px text-[9px] font-extrabold tracking-[0.12em]",
        "bg-[linear-gradient(135deg,#22d3ee,#3b82f6)] text-white shadow-[0_2px_8px_rgb(59_130_246/0.35)]",
        className,
      )}
    >
      BETA
    </span>
  );
}

// Thin strip under the header. Closing it sets a cookie for a month, so the
// server doesn't render it again (no flash on the next visit).
export function BetaBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const dismiss = () => {
    document.cookie = `${BETA_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    setOpen(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-3">
      <div className="glass-lite animate-rise flex items-center gap-3 rounded-2xl py-2 pe-2 ps-3.5 text-sm">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
          <FlaskConical className="size-4" />
        </span>
        <p className="min-w-0 flex-1 leading-snug text-muted">
          <strong className="font-semibold text-foreground">Kami בהרצה (בטא).</strong>{" "}
          עסקים מצטרפים בימים אלה וחלק מהמידע עוד חלקי. מצאתם תקלה?{" "}
          <Link href="/contact" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
            ספרו לנו
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="סגירת ההודעה"
          className="focus-ring pressable inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[var(--glass-bg)] hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
