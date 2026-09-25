"use client";

// One impression per ad per browser tab per day, sent when the ad is on screen.
const seen = new Set<string>();

export function trackImpression(id: string) {
  const key = `kami_ad_${id}_${new Date().toDateString()}`;
  if (seen.has(key)) return;
  seen.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // storage blocked: count once per page load
  }
  const body = JSON.stringify({ ids: [id] });
  if (!navigator.sendBeacon?.("/api/ads/impressions", new Blob([body], { type: "application/json" }))) {
    fetch("/api/ads/impressions", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  }
}
