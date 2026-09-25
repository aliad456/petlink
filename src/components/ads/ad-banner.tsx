"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { adMediaUrl } from "@/lib/ad-media";
import { cn } from "../ui";
import { trackImpression } from "./track";

export type BannerAd = {
  id: string;
  kind: "ad" | "adoption";
  advertiser: string;
  alt_text: string;
  image_path: string;
  mobile_image_path: string | null;
  has_link: boolean;
  // The placement's size, set by the owner in the admin (keeps proportions).
  width: number;
  height: number;
  mobile_width: number | null;
  mobile_height: number | null;
};

const ROTATE_MS = 6000;

export function AdLabel({ kind, className }: { kind: BannerAd["kind"]; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm",
        className,
      )}
    >
      {kind === "adoption" ? (
        <>
          <Heart className="size-3 fill-current text-rose-300" />
          יום אימוץ
        </>
      ) : (
        "ממומן"
      )}
    </span>
  );
}

// Ads of one placement that take turns. The box keeps the placement's
// proportions; on phones it uses the phone size when the ad has a phone image.
// `preview`: no counting and no navigation (admin / advertiser preview).
export function AdBanner({ ads, className, preview = false }: { ads: BannerAd[]; className?: string; preview?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!preview && visible && ads[index]) trackImpression(ads[index].id);
  }, [visible, index, ads, preview]);

  useEffect(() => {
    if (ads.length < 2 || paused || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % ads.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, ads.length, paused, visible]);

  if (!ads.length) return null;
  const first = ads[0];
  const phoneSize = first.mobile_width && first.mobile_height && ads.some((a) => a.mobile_image_path);
  const style = {
    "--ar": `${first.width} / ${first.height}`,
    "--ar-m": phoneSize ? `${first.mobile_width} / ${first.mobile_height}` : `${first.width} / ${first.height}`,
  } as CSSProperties;

  return (
    <section
      ref={ref}
      aria-roledescription="קרוסלה"
      aria-label="מודעות"
      style={style}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-[var(--glass-lite-bg)] shadow-[var(--glass-shadow)] sm:rounded-[1.5rem]",
        "aspect-[var(--ar-m)] sm:aspect-[var(--ar)]",
        className,
      )}
    >
      {ads.map((ad, i) => {
        const wide = adMediaUrl(ad.image_path)!;
        const phone = adMediaUrl(ad.mobile_image_path);
        const active = i === index;
        const img = (
          <picture>
            {phone && <source media="(max-width: 639px)" srcSet={phone} />}
            <img src={wide} alt={ad.alt_text} loading={i === 0 ? "eager" : "lazy"} className="size-full object-cover" draggable={false} />
          </picture>
        );
        return (
          <div
            key={ad.id}
            aria-hidden={!active}
            className={cn(
              "absolute inset-0 transition-[opacity,transform] duration-700 ease-out-soft",
              active ? "opacity-100" : "pointer-events-none scale-[1.02] opacity-0",
            )}
          >
            {ad.has_link && !preview ? (
              <a href={`/go/ad/${ad.id}`} target="_blank" rel="sponsored noopener" tabIndex={active ? 0 : -1} className="focus-ring block size-full">
                {img}
              </a>
            ) : (
              img
            )}
            <AdLabel kind={ad.kind} className="absolute start-2 top-2" />
          </div>
        );
      })}

      {ads.length > 1 && (
        <div className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              aria-label={`מודעה ${i + 1} מתוך ${ads.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="focus-ring flex h-5 items-center rounded-full px-0.5"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full bg-white shadow transition-[width,opacity] duration-300",
                  i === index ? "w-4 opacity-100" : "w-1.5 opacity-60",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
