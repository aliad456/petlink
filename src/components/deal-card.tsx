import { BadgePercent } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { mediaUrl } from "@/lib/business/media";
import type { Deal } from "@/lib/deals";
import { tintFor } from "@/lib/tints";
import { CategoryIcon } from "./category-icon";
import { cn } from "./ui";

export function DealCard({ deal, index = 0 }: { deal: Deal; index?: number }) {
  const avatar = mediaUrl(deal.avatar_path);
  const tint = tintFor(deal.category?.icon);
  const [, m, d] = deal.deal_until.split("-").map(Number);
  return (
    <Link
      href={`/b/${deal.public_id}`}
      transitionTypes={["nav-forward"]}
      className="surface pressable focus-ring animate-rise relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.5rem] p-4"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      <span className="bg-sun inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-bold">
        <BadgePercent className="size-3.5" />
        עד {d}/{m}
      </span>
      <p className="line-clamp-2 text-lg font-extrabold leading-snug">{deal.deal_text}</p>
      <div className="mt-auto flex items-center gap-2.5">
        <span className={cn("relative size-9 shrink-0 overflow-hidden rounded-full", tint.solid)}>
          {avatar ? (
            <Image src={avatar} alt="" fill sizes="36px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center">
              <CategoryIcon name={deal.category?.icon ?? null} className="size-4" strokeWidth={2} />
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
