"use client";

import { BadgeCheck, MessageCircle, Phone, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/components/ui";
import { hasAnyHours, openState } from "@/lib/business/hours";
import { mediaUrl } from "@/lib/business/media";
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

export function ResultCard({ r, index }: { r: SearchResult; index: number }) {
  const client = useClient();
  const cover = mediaUrl(r.cover_path);
  const avatar = mediaUrl(r.avatar_path);
  const state = client && hasAnyHours(r.hours) ? openState(r.hours) : null;
  const wa = r.whatsapp || r.phone;

  return (
    <article
      className="glass-lite glass-glow animate-rise group relative flex flex-col overflow-hidden rounded-[1.75rem] transition-transform duration-500 ease-spring hover:-translate-y-1"
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
          <div className="bg-kami relative size-full opacity-90">
            <div aria-hidden className="absolute inset-0 bg-white/25 [mask:url(/doodles.svg)_0_0/300px_300px_repeat]" />
          </div>
        )}
        {r.is_featured && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-xs font-bold text-amber-950 shadow">
            <Star className="size-3 fill-current" />
            מומלץ
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-4 pb-4">
        <div className="-mt-8 flex items-end gap-3">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--background)] bg-[var(--background)] shadow-lg">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <span className="bg-kami flex size-full items-center justify-center text-white">
                <CategoryIcon name={r.category_icon} className="size-7" />
              </span>
            )}
          </span>
          {state && (
            <span
              className={cn(
                "mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                state.open
                  ? "bg-[color-mix(in_oklab,var(--success)_15%,transparent)] text-success"
                  : "bg-[color-mix(in_oklab,var(--muted)_14%,transparent)] text-muted",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {state.open ? `פתוח · עד ${state.closesAt}` : "סגור עכשיו"}
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
            <BadgeCheck className="size-[18px] shrink-0 text-brand" aria-label="עסק מאושר" />
          </h3>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            <span>{r.category_name}</span>
            {r.city && <span>· {r.city}</span>}
            {r.distance_km != null && <span>· {r.distance_km < 1 ? "פחות מק״מ" : `${r.distance_km.toLocaleString("he-IL")} ק״מ`}</span>}
          </p>
        </div>

        {r.tagline && <p className="line-clamp-1 text-sm text-foreground/80">{r.tagline}</p>}

        {r.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {r.features.map((f) => (
              <li key={f} className="rounded-full bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-2.5 py-1 text-xs font-medium text-brand-strong dark:text-brand">
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="relative z-10 mt-auto flex gap-2 pt-1">
          {r.phone && (
            <a
              href={`tel:${r.phone}`}
              className="pressable focus-ring inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-sm font-semibold text-white"
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
              className="pressable focus-ring glass inline-flex size-10 items-center justify-center rounded-xl"
            >
              <MessageCircle className="size-[18px] text-[#128c7e] dark:text-[#25d366]" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
