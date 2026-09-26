// Light / dark mode. "system" (default) follows the device; an explicit choice
// is stored in localStorage and applied as a class on <html> (theme-light /
// theme-dark) by the inline script in the root layout, before first paint.

export const THEME_KEY = "kami_theme";
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_COLOR = { light: "#eef2f4", dark: "#05080b" } as const;

// Browser-chrome colour (address bar). An explicit choice adds our own
// theme-color tag first in <head> (the first match wins); React's tags stay untouched.
function paintMeta(effective: "light" | "dark" | null) {
  document.getElementById("kami-theme-color")?.remove();
  if (!effective) return;
  const m = Object.assign(document.createElement("meta"), { id: "kami-theme-color", name: "theme-color", content: THEME_COLOR[effective] });
  document.head.prepend(m);
}

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function effectiveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(choice: ThemeChoice) {
  const c = document.documentElement.classList;
  c.remove("theme-light", "theme-dark");
  if (choice !== "system") c.add(`theme-${choice}`);
  paintMeta(choice === "system" ? null : choice);
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // storage blocked: applies for this visit only
  }
  window.dispatchEvent(new Event("kami-theme"));
}

// Runs before React (keep it small and dependency-free).
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.classList.add("theme-"+t);var m=document.createElement("meta");m.id="kami-theme-color";m.name="theme-color";m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.head.prepend(m)}}catch(e){}`;
