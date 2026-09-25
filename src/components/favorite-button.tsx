"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/favorite-actions";
import { toast } from "./toast";
import { cn } from "./ui";

// Heart that saves a business to "העסקים ששמרתי". `saved` null = signed out.
export function FavoriteButton({
  businessId,
  saved,
  className,
  variant = "glass",
}: {
  businessId: string;
  saved: boolean | null;
  className?: string;
  variant?: "glass" | "overlay";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useOptimistic(!!saved);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "הסרה מהשמורים" : "שמירה לעסקים שלי"}
      title={on ? "הסרה מהשמורים" : "שמירה"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (saved === null) return router.push(`/login?next=${encodeURIComponent(pathname)}`);
        startTransition(async () => {
          setOn(!on);
          const r = await toggleFavorite(businessId, !on);
          if (r.error) toast.error(r.error);
          else {
            if (!on) toast.success("נשמר בעסקים שלך");
            router.refresh();
          }
        });
      }}
      className={cn(
        "pressable focus-ring inline-flex size-10 items-center justify-center rounded-full",
        variant === "overlay"
          ? "bg-black/30 text-white backdrop-blur-md hover:bg-black/40"
          : "bg-[var(--glass-bg-strong)] shadow-md",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-5 transition-transform duration-300 ease-spring",
          on && "scale-110 fill-rose-500 text-rose-500",
          !on && variant === "glass" && "text-muted",
        )}
      />
    </button>
  );
}
