"use client";

import { Heart, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toggleFavorite } from "@/app/favorite-actions";
import { Dialog } from "./dialog";
import { toast } from "./toast";
import { buttonClass, cn } from "./ui";

// Heart that saves a business to "העסקים ששמרתי". `saved` null = signed out:
// then it explains what saving gives and offers a free sign-up; after signing up
// (or in) /save/[id] saves the business and brings the user back here.
export function FavoriteButton({
  businessId,
  businessName,
  saved,
  className,
  variant = "glass",
}: {
  businessId: string;
  businessName?: string;
  saved: boolean | null;
  className?: string;
  variant?: "glass" | "overlay";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useOptimistic(!!saved);
  const [, startTransition] = useTransition();
  const [ask, setAsk] = useState(false);
  const after = `/save/${businessId}?back=${encodeURIComponent(pathname)}`;

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? "הסרה מהשמורים" : "שמירה לעסקים שלי"}
        title={on ? "הסרה מהשמורים" : "שמירה"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (saved === null) return setAsk(true);
          startTransition(async () => {
            setOn(!on);
            const r = await toggleFavorite(businessId, !on);
            if (r.signedOut) {
              setAsk(true);
              router.refresh();
            } else if (r.error) toast.error(r.error);
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

      {/* Portaled and wrapped: the heart sits inside card links, and clicks in the
          dialog must not bubble up to them (React events follow the React tree). */}
      {ask &&
        createPortal(
          <div onClick={(e) => e.stopPropagation()}>
            <Dialog
              open={ask}
              onClose={() => setAsk(false)}
              title={businessName ? `לשמור את "${businessName}"?` : "לשמור את העסק?"}
              description="הירשמו בחינם תוך כמה שניות, וכל העסקים שאהבתם יחכו לכם במקום אחד, בטלפון ובמחשב."
            >
              <div className="flex flex-col gap-4">
                <ul className="flex flex-col gap-2 text-sm">
                  {[
                    "העסקים ששמרתם, תמיד בהישג יד",
                    "כרטיס לכלב שלכם: חיסונים, תורים ותזכורות",
                    "קביעת תורים ועדכונים לטלפון",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Sparkles className="size-4 shrink-0 text-brand" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/signup?next=${encodeURIComponent(after)}`}
                    className={buttonClass({ className: "w-full" })}
                  >
                    <Heart className="size-4" />
                    הרשמה בחינם ושמירה
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(after)}`}
                    className={buttonClass({
                      variant: "glass",
                      className: "w-full",
                    })}
                  >
                    <LogIn className="size-4" />
                    כבר יש לי חשבון
                  </Link>
                </div>
              </div>
            </Dialog>
          </div>,
          document.body,
        )}
    </>
  );
}
