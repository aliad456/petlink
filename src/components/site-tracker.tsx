"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { CAMPAIGN_KEY } from "@/lib/signup";

// Sends a page view on every navigation and a "still here" ping every minute
// while the tab is visible (for "עכשיו באתר"). Staff and preview pages aren't counted.
const SKIP = ["/admin", "/preview-frame", "/preview/", "/go/", "/api/"];

function send(type: "view" | "ping", path: string, ref?: string, campaign?: string) {
  const body = JSON.stringify({ type, path, ref, campaign });
  if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
}

export function SiteTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p)) || last.current === pathname) return;
    // The referrer (and an ad's ?utm_source= tag) only mean something on the first page of the visit.
    if (last.current === null) {
      const campaign = new URLSearchParams(location.search).get("utm_source")?.toLowerCase() || undefined;
      if (campaign) {
        try {
          sessionStorage.setItem(CAMPAIGN_KEY, campaign);
        } catch {}
      }
      send("view", pathname, document.referrer, campaign);
    } else {
      send("view", pathname);
    }
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
