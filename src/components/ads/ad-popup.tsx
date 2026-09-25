"use client";

import { Heart, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { adMediaUrl } from "@/lib/ad-media";
import { cn } from "../ui";
import type { BannerAd } from "./ad-banner";
import { trackImpression } from "./track";

const WAIT_SECONDS = 3;

// Full-screen ad on entering the site (1080×1920). Shown once per day per
// visitor; the close button unlocks after a short countdown.
export function AdPopup({ ad }: { ad: BannerAd | null }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(WAIT_SECONDS);
  const closeRef = useRef<HTMLButtonElement>(null);
  const key = ad ? `kami_popup_${ad.id}_${new Date().toDateString()}` : "";

  useEffect(() => {
    if (!ad) return;
    let shown = false;
    try {
      shown = !!localStorage.getItem(key);
      localStorage.setItem(key, "1");
    } catch {
      // storage blocked: show it, once per page load
    }
    if (shown) return;
    const t = setTimeout(() => {
      setOpen(true);
      trackImpression(ad.id);
    }, 600); // let the page paint first
    return () => clearTimeout(t);
  }, [ad, key]);

  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && left <= 0 && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, left]);

  useEffect(() => {
    if (open && left <= 0) closeRef.current?.focus();
  }, [open, left]);

  if (!ad || !open) return null;
  const src = adMediaUrl(ad.image_path)!;
  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- exact advertiser artwork
    <img src={src} alt={ad.alt_text} className="size-full object-cover" draggable={false} />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ad.kind === "adoption" ? "יום אימוץ" : "מודעה"}
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && left <= 0 && setOpen(false)}
    >
      <div className="animate-pop relative h-full w-full overflow-hidden bg-black sm:aspect-[9/16] sm:h-[min(88vh,960px)] sm:w-auto sm:rounded-[2rem] sm:shadow-2xl">
        {ad.has_link ? (
          <a href={`/go/ad/${ad.id}`} target="_blank" rel="sponsored noopener" className="block size-full" onClick={() => setOpen(false)}>
            {image}
          </a>
        ) : (
          image
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {ad.kind === "adoption" ? (
              <>
                <Heart className="size-3.5 fill-current text-rose-300" />
                יום אימוץ
              </>
            ) : (
              "ממומן"
            )}
          </span>
          <button
            ref={closeRef}
            type="button"
            disabled={left > 0}
            onClick={() => setOpen(false)}
            aria-label={left > 0 ? `אפשר לסגור בעוד ${left} שניות` : "סגירה"}
            className={cn(
              "focus-ring inline-flex size-11 items-center justify-center rounded-2xl bg-white/85 text-lg font-bold text-[#0b1215] shadow-lg backdrop-blur-sm transition-transform",
              left <= 0 && "pressable",
            )}
          >
            {left > 0 ? <span className="tabular-nums">{left}</span> : <X className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
