"use client";

import { BadgeCheck, MessageCircle, Phone, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { FavoriteButton } from "@/components/favorite-button";
import { cn } from "@/components/ui";
import { hasAnyHours, isClosingSoon, openLabel, openState } from "@/lib/business/hours";
import { mediaUrl } from "@/lib/business/media";
import { tintFor } from "@/lib/tints";
import type { SearchResult } from "@/lib/search/load";

const useClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

function whatsapp(n: string) {
  const d = n.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? `972${d.slice(1)}` : d}`;
}

// `saved`: in the viewer's favorites (null = signed out, undefined = no heart).
export function ResultCard({ r, index, saved }: { r: SearchResult; index: number; saved?: boolean | null }) {
  const client = useClient();
  const cover = mediaUrl(r.cover_path);
  const avatar = mediaUrl(r.avatar_path);
  const state = client && hasAnyHours(r.hours) ? openState(r.hours) : null;
  // Unclaimed pages: only an explicit WhatsApp number (the public phone may be a landline).
  const wa = r.whatsapp || (r.unclaimed ? null : r.phone);
  const tint = tintFor(r.category_icon);

  return (
    <article
      className="surface animate-rise group relative flex flex-col overflow-hidden rounded-[1.5rem] transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-1 hover:shadow-[0_2px_4px_rgb(60_45_20/0.06),0_14px_32px_rgb(60_45_20/0.1)]"
      style={{ "--i": Math.min(index, 10) } as CSSProperties}
    >
      <div className="relative h-24 overflow-hidden">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 330px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-105"
          />
        ) : (
          <div className={cn("relative size-full", tint.tile)}>
            <div aria-hidden className="absolute inset-0 bg-current opacity-[0.14] [mask:url(/doodles.svg)_0_0/260px_260px_repeat]" />
          </div>
        )}
        {saved !== undefined && (
          <FavoriteButton businessId={r.id} businessName={r.name} saved={saved} variant="overlay" className="absolute end-3 top-3 z-10 size-9" />
        )}
        {r.is_featured && (
          <span className="bg-sun absolute start-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold">
            <Star className="size-3 fill-current" />
            מומלץ
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--surface)] shadow-[0_4px_12px_rgb(60_45_20/0.12)]">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <span className={cn("flex size-full items-center justify-center", tint.solid)}>
                <CategoryIcon name={r.category_icon} className="size-7" strokeWidth={1.75} />
              </span>
            )}
          </span>
          {state && (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isClosingSoon(state)
                  ? "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning"
                  : state.open
                    ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success"
                    : "bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] text-muted",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {openLabel(state, undefined, true)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <h3 className="flex items-center gap-1.5 text-lg font-bold leading-snug">
            {/* The whole card is clickable through this link's overlay. */}
            <Link
              href={`/b/${r.public_id}`}
              transitionTypes={["nav-forward"]}
              className="focus-ring rounded-md after:absolute after:inset-0 after:content-['']"
            >
              {r.name}
            </Link>
            {!r.unclaimed && <BadgeCheck className="size-[18px] shrink-0 text-brand" aria-label="עסק מאושר" />}
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            {r.review_count > 0 && r.rating_avg != null && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400">
                <Star className="size-3.5 fill-current" />
                {Number(r.rating_avg).toFixed(1)}
                <span className="font-normal text-muted">({r.review_count})</span>
                <span className="text-muted">·</span>
              </span>
            )}
            <span>{r.category_name}</span>
            {r.city && <span>· {r.city}</span>}
            {r.distance_km != null && <span>· {r.distance_km < 1 ? "פחות מק״מ" : `${r.distance_km.toLocaleString("he-IL")} ק״מ`}</span>}
          </p>
        </div>

        {r.tagline && <p className="line-clamp-1 text-sm text-foreground/80">{r.tagline}</p>}

        {r.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {r.features.map((f) => (
              <li key={f} className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-foreground/75">
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="relative z-10 mt-auto flex gap-2 pt-1">
          {r.phone && (
            <a
              href={`tel:${r.phone}`}
              className="btn-brand pressable focus-ring inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold"
            >
              <Phone className="size-4" />
              התקשרו
            </a>
          )}
          {wa && (
            <a
              href={whatsapp(wa)}
              target="_blank"
              rel="noreferrer"
              aria-label="וואטסאפ"
              className="pressable focus-ring inline-flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[#25d366]/10"
            >
              <MessageCircle className="size-[18px] text-[#128c7e] dark:text-[#25d366]" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
