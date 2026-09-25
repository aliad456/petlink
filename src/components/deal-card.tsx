import { BadgePercent } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { mediaUrl } from "@/lib/business/media";
import type { Deal } from "@/lib/deals";
import { CategoryIcon } from "./category-icon";

export function DealCard({ deal, index = 0 }: { deal: Deal; index?: number }) {
  const avatar = mediaUrl(deal.avatar_path);
  const [, m, d] = deal.deal_until.split("-").map(Number);
  return (
    <Link
      href={`/b/${deal.public_id}`}
      transitionTypes={["nav-forward"]}
      className="glass-lite glass-glow pressable focus-ring animate-rise relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.5rem] p-4"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      <span className="absolute -start-6 -top-6 size-20 rounded-full bg-[radial-gradient(circle,rgb(251_146_60/0.35),transparent_70%)]" aria-hidden />
      <span className="inline-flex items-center gap-1 self-start rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
        <BadgePercent className="size-3.5" />
        עד {d}/{m}
      </span>
      <p className="line-clamp-2 text-lg font-extrabold leading-snug">{deal.deal_text}</p>
      <div className="mt-auto flex items-center gap-2.5">
        <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-kami text-white">
          {avatar ? (
            <Image src={avatar} alt="" fill sizes="36px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <CategoryIcon name={deal.category?.icon ?? null} className="size-4" />
            </span>
          )}
        </span>
        <span className="min-w-0 text-sm">
          <span className="block truncate font-semibold">{deal.name}</span>
          <span className="block truncate text-xs text-muted">{[deal.category?.name, deal.city].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
    </Link>
  );
}
