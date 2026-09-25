"use client";

import { HeartHandshake } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { adMediaUrl } from "@/lib/ad-media";
import { AdLabel, type BannerAd } from "./ad-banner";
import { trackImpression } from "./track";

// Adoption-day posters from organisations, stacked (masonry). Each poster
// keeps its own proportions; any number of them.
export function AdGallery({ ads, preview = false }: { ads: BannerAd[]; preview?: boolean }) {
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (preview) first.current?.scrollIntoView({ block: "center" });
  }, [preview]);

  if (!ads.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-[var(--glass-bg)] px-4 py-3 text-sm text-muted">
        <HeartHandshake className="size-4 shrink-0" />
        אין כרגע ימי אימוץ מתוכננים. שווה לבדוק שוב בקרוב.
      </p>
    );
  }

  return (
    <div ref={first} className="columns-1 gap-4 sm:columns-2 lg:columns-3">
      {ads.map((ad, i) => (
        <Poster key={ad.id} ad={ad} index={i} preview={preview} />
      ))}
    </div>
  );
}

function Poster({ ad, index, preview }: { ad: BannerAd; index: number; preview: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || preview) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          trackImpression(ad.id);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad.id, preview]);

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- organisation's poster, natural size
    <img src={adMediaUrl(ad.image_path)!} alt={ad.alt_text} loading={index < 3 ? "eager" : "lazy"} className="block w-full" />
  );

  return (
    <figure
      ref={ref}
      className="glass-lite animate-rise relative mb-4 break-inside-avoid overflow-hidden rounded-[1.5rem]"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      {ad.has_link && !preview ? (
        <a href={`/go/ad/${ad.id}`} target="_blank" rel="sponsored noopener" className="focus-ring block">
          {image}
        </a>
      ) : (
        image
      )}
      <AdLabel kind={ad.kind} className="absolute start-3 top-3" />
      <figcaption className="flex items-center gap-2 px-4 py-3 text-sm font-semibold">
        <HeartHandshake className="size-4 shrink-0 text-rose-500" />
        {ad.advertiser}
      </figcaption>
    </figure>
  );
}
