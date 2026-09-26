"use client";

import { Accessibility, Contrast, Link2, MonitorSmartphone, Moon, Pause, RotateCcw, Sun, Type, X, ZoomIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { A11Y_DEFAULT, A11Y_KEY, a11yClasses, type A11yPrefs } from "@/lib/a11y";
import { applyTheme, readTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "./ui";

const ALL = ["a11y-text-1", "a11y-text-2", "a11y-text-3", "a11y-contrast", "a11y-no-motion", "a11y-links", "a11y-readable"];
// Pages with their own bottom bar or that are shown inside a preview.
const HIDDEN = ["/admin", "/business/edit", "/preview-frame"];

function load(): A11yPrefs {
  try {
    return { ...A11Y_DEFAULT, ...JSON.parse(localStorage.getItem(A11Y_KEY) ?? "null") };
  } catch {
    return A11Y_DEFAULT;
  }
}

export function AccessibilityMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Only read on the client; the panel (the only place prefs show) starts closed,
  // so server and client render the same.
  const [prefs, setPrefs] = useState<A11yPrefs>(() => (typeof window === "undefined" ? A11Y_DEFAULT : load()));
  const [theme, setTheme] = useState<ThemeChoice>(() => (typeof window === "undefined" ? "system" : readTheme()));
  const panel = useRef<HTMLDivElement>(null);

  // The header's sun/moon button changes the theme too: stay in sync.
  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener("kami-theme", sync);
    return () => window.removeEventListener("kami-theme", sync);
  }, []);
  const trigger = useRef<HTMLButtonElement>(null);

  const apply = (next: A11yPrefs) => {
    setPrefs(next);
    const html = document.documentElement.classList;
    html.remove(...ALL);
    html.add(...a11yClasses(next));
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(next));
    } catch {
      // storage blocked: applies for this visit only
    }
  };

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (HIDDEN.some((p) => pathname.startsWith(p))) return null;
  const changed = JSON.stringify(prefs) !== JSON.stringify(A11Y_DEFAULT);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות"
        title="נגישות"
        onClick={() => setOpen((o) => !o)}
        className="pressable focus-ring fixed bottom-4 left-4 z-[90] inline-flex size-12 items-center justify-center rounded-full bg-[#1d4ed8] text-white shadow-[0_8px_24px_rgb(29_78_216/0.4)] print:hidden"
      >
        <Accessibility className="size-6" />
      </button>

      {open && (
        <div
          ref={panel}
          id="a11y-panel"
          role="dialog"
          aria-label="הגדרות נגישות"
          className="glass-strong animate-rise fixed bottom-20 left-4 z-[90] flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-[1.5rem] border border-[var(--glass-border)] p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold">נגישות</h2>
            <button
              type="button"
              aria-label="סגירה"
              onClick={() => setOpen(false)}
              className="pressable focus-ring inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-[var(--glass-bg)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              <ZoomIn className="size-4" />
              גודל טקסט
            </span>
            <div role="radiogroup" aria-label="גודל טקסט" className="grid grid-cols-4 gap-1.5">
              {([0, 1, 2, 3] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={prefs.text === n}
                  aria-label={n === 0 ? "רגיל" : `הגדלה ${n}`}
                  onClick={() => apply({ ...prefs, text: n })}
                  className={cn(
                    "pressable focus-ring h-10 rounded-xl border font-bold",
                    prefs.text === n ? "border-transparent bg-[#1d4ed8] text-white" : "border-[var(--border)] bg-[var(--glass-bg)]",
                  )}
                  style={{ fontSize: `${0.8 + n * 0.12}rem` }}
                >
                  א
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">מצב תצוגה</span>
            <div role="radiogroup" aria-label="מצב תצוגה" className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["system", "אוטומטי", <MonitorSmartphone key="s" className="size-4" />],
                  ["light", "בהיר", <Sun key="l" className="size-4" />],
                  ["dark", "כהה", <Moon key="d" className="size-4" />],
                ] as const
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  onClick={() => {
                    applyTheme(value);
                    setTheme(value);
                  }}
                  className={cn(
                    "pressable focus-ring flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium",
                    theme === value ? "border-transparent bg-[#1d4ed8] text-white" : "border-[var(--border)] bg-[var(--glass-bg)]",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Toggle icon={<Contrast className="size-4" />} label="ניגודיות גבוהה" on={prefs.contrast} onChange={(v) => apply({ ...prefs, contrast: v })} />
          <Toggle icon={<Pause className="size-4" />} label="עצירת אנימציות" on={prefs.noMotion} onChange={(v) => apply({ ...prefs, noMotion: v })} />
          <Toggle icon={<Link2 className="size-4" />} label="הדגשת קישורים" on={prefs.links} onChange={(v) => apply({ ...prefs, links: v })} />
          <Toggle icon={<Type className="size-4" />} label="גופן קריא" on={prefs.readable} onChange={(v) => apply({ ...prefs, readable: v })} />

          <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-sm">
            <Link href="/accessibility" onClick={() => setOpen(false)} className="focus-ring rounded font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
              הצהרת נגישות
            </Link>
            {changed && (
              <button
                type="button"
                onClick={() => apply(A11Y_DEFAULT)}
                className="pressable focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-muted hover:bg-[var(--glass-bg)]"
              >
                <RotateCcw className="size-3.5" />
                איפוס
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({ icon, label, on, onChange }: { icon: ReactNode; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "pressable focus-ring flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium",
        on ? "border-transparent bg-[#1d4ed8] text-white" : "border-[var(--border)] bg-[var(--glass-bg)]",
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={cn("text-xs", on ? "text-white/85" : "text-muted")}>{on ? "פעיל" : "כבוי"}</span>
    </button>
  );
}
