"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Sends a page view on every navigation and a "still here" ping every minute
// while the tab is visible (for "עכשיו באתר"). Staff and preview pages aren't counted.
const SKIP = ["/admin", "/preview-frame", "/preview/", "/go/", "/api/"];

function send(type: "view" | "ping", path: string, ref?: string) {
  const body = JSON.stringify({ type, path, ref });
  if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

export function SiteTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p)) || last.current === pathname) return;
    // The referrer only means something on the first page of the visit.
    send("view", pathname, last.current === null ? document.referrer : undefined);
    last.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && !SKIP.some((p) => location.pathname.startsWith(p))) {
        send("ping", location.pathname);
      }
    };
    const t = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return null;
}
