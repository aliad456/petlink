// Accessibility preferences (menu at the bottom corner). Stored in
// localStorage and applied as classes on <html>; the inline script in the root
// layout applies them before first paint so the page doesn't jump.

export const A11Y_KEY = "kami_a11y";

export type A11yPrefs = {
  text: 0 | 1 | 2 | 3; // 100%, 112.5%, 125%, 137.5%
  contrast: boolean;
  noMotion: boolean;
  links: boolean;
  readable: boolean;
};

export const A11Y_DEFAULT: A11yPrefs = { text: 0, contrast: false, noMotion: false, links: false, readable: false };

export function a11yClasses(p: A11yPrefs): string[] {
  const c: string[] = [];
  if (p.text) c.push(`a11y-text-${p.text}`);
  if (p.contrast) c.push("a11y-contrast");
  if (p.noMotion) c.push("a11y-no-motion");
  if (p.links) c.push("a11y-links");
  if (p.readable) c.push("a11y-readable");
  return c;
}

// Runs before React (keep it small and dependency-free).
export const A11Y_BOOT = `try{var p=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"null");if(p){var c=document.documentElement.classList;if(p.text)c.add("a11y-text-"+p.text);if(p.contrast)c.add("a11y-contrast");if(p.noMotion)c.add("a11y-no-motion");if(p.links)c.add("a11y-links");if(p.readable)c.add("a11y-readable")}}catch(e){}`;
