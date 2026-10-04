"use client";

import { RotateCcw, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { adMediaUrl } from "@/lib/ad-media";
import { cn } from "../ui";
import { AdLabel, type BannerAd } from "./ad-banner";
import { trackImpression } from "./track";

const WAIT_SECONDS = 3;

// Full-screen ad. Opens on every visit to the site and every time the visitor
// comes back to the home page (including a click on the logo while already
// there). Not shown to PRO subscribers. The close button unlocks after a short
// countdown.
// `preview`: always opens, no counting, and can be replayed.
export function AdPopup({ ad, preview = false }: { ad: BannerAd | null; preview?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(WAIT_SECONDS);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handledPath = useRef<string | null>(null); // last path the popup decision was made for
  const suppressed = !preview && pathname.startsWith("/preview-frame");

  // Every page load, then every arrival on the home page.
  useEffect(() => {
    if (!ad || suppressed) return;
    const seen = handledPath.current;
    if (seen !== null && (preview || pathname !== "/" || seen === "/")) {
      handledPath.current = pathname;
      return;
    }
    const t = setTimeout(() => {
      handledPath.current = pathname;
      setLeft(WAIT_SECONDS);
      setOpen(true);
      if (!preview) trackImpression(ad.id);
    }, 600); // let the page paint first
    return () => clearTimeout(t);
  }, [ad, pathname, preview, suppressed]);

  // A click on a link to the home page while already on it doesn't change the path.
  useEffect(() => {
    if (!ad || preview || suppressed || pathname !== "/") return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (link?.getAttribute("href") !== "/") return;
      setLeft(WAIT_SECONDS);
      setOpen(true);
      trackImpression(ad.id);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [ad, pathname, preview, suppressed]);

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

  if (!ad || suppressed) return null;

  if (!open) {
    return preview ? (
      <button
        type="button"
        onClick={() => {
          setLeft(WAIT_SECONDS);
          setOpen(true);
        }}
        className="pressable focus-ring fixed bottom-[calc(var(--bottom-nav,0px)+1.25rem)] left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-xl"
      >
        <RotateCcw className="size-4" />
        להציג שוב את הפופאפ
      </button>
    ) : null;
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- exact advertiser artwork
    <img src={adMediaUrl(ad.image_path)!} alt={ad.alt_text} className="size-full object-cover" draggable={false} />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ad.kind === "adoption" ? "יום אימוץ" : "מודעה"}
      className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && left <= 0 && setOpen(false)}
    >
      <div
        style={{ aspectRatio: `${ad.width} / ${ad.height}` }}
        className="animate-pop relative h-full w-full overflow-hidden bg-black sm:h-[min(88vh,960px)] sm:w-auto sm:rounded-[2rem] sm:shadow-2xl max-sm:!aspect-auto"
      >
        {ad.has_link && !preview ? (
          <a href={`/go/ad/${ad.id}`} target="_blank" rel="sponsored noopener" className="block size-full" onClick={() => setOpen(false)}>
            {image}
          </a>
        ) : (
          image
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <AdLabel kind={ad.kind} className="px-3 py-1.5 text-xs" />
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
