"use client";

import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
};

const ROTATE_MS = 6000;

// Up to 3 ads that take turns. Wide image (1200×480) on larger screens, the
// square one (1080×1080) on phones when the advertiser supplied it.
export function AdBanner({ ads, className }: { ads: BannerAd[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasSquare = ads.some((a) => a.mobile_image_path);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (visible && ads[index]) trackImpression(ads[index].id);
  }, [visible, index, ads]);

  useEffect(() => {
    if (ads.length < 2 || paused || !visible) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % ads.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, ads.length, paused, visible]);

  if (!ads.length) return null;

  return (
    <section
      ref={ref}
      aria-roledescription="קרוסלה"
      aria-label="מודעות"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative w-full overflow-hidden rounded-[1.75rem] bg-[var(--glass-lite-bg)] shadow-[var(--glass-shadow)]",
        hasSquare ? "aspect-square sm:aspect-[5/2]" : "aspect-[5/2]",
        className,
      )}
    >
      {ads.map((ad, i) => {
        const wide = adMediaUrl(ad.image_path)!;
        const square = adMediaUrl(ad.mobile_image_path);
        const active = i === index;
        const img = (
          <picture>
            {square && <source media="(max-width: 639px)" srcSet={square} />}
            <img
              src={wide}
              alt={ad.alt_text}
              loading={i === 0 ? "eager" : "lazy"}
              className="size-full object-cover"
              draggable={false}
            />
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
            {ad.has_link ? (
              <a
                href={`/go/ad/${ad.id}`}
                target="_blank"
                rel="sponsored noopener"
                tabIndex={active ? 0 : -1}
                className="focus-ring block size-full"
              >
                {img}
              </a>
            ) : (
              img
            )}
            <span className="pointer-events-none absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {ad.kind === "adoption" ? (
                <>
                  <Heart className="size-3 fill-current text-rose-300" />
                  יום אימוץ
                </>
              ) : (
                "ממומן"
              )}
            </span>
          </div>
        );
      })}

      {ads.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {ads.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              aria-label={`מודעה ${i + 1} מתוך ${ads.length}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="focus-ring flex h-6 items-center rounded-full px-1"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full bg-white shadow transition-[width,opacity] duration-300",
                  i === index ? "w-5 opacity-100" : "w-1.5 opacity-60",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
