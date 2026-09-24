import { ViewTransition, type ReactNode } from "react";

const DIRECTIONAL = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

// Wrap each page's content (not layouts — they persist across navigations).
// Links opt in with transitionTypes={["nav-forward"]} or ["nav-back"].
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      {children}
    </ViewTransition>
  );
}
