import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "./ui";

// Kami logo.
//
// At rest: the K inside a glowing gradient ring (the main mark).
// On hover / keyboard focus: the ring dissolves outward and the full
// "Kami" wordmark opens out of the K.
//
// The artwork is three transparent images cut from the brand files
// (public/brand): the K, the "ami" letters (used as a mask so they take
// the text colour in light and dark mode) and the green leaf. Offsets are
// in `em` of the K's height, measured from the original wordmark.

const K_ASPECT = 1.0244; // width / height of kami-k.webp

export function LogoMark({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset
    <img
      src="/brand/kami-k.webp"
      alt=""
      width={Math.round(size * K_ASPECT)}
      height={size}
      className={cn("pointer-events-none select-none", className)}
      draggable={false}
    />
  );
}

export function Logo({
  href = "/",
  className,
  size = 30,
}: {
  href?: string;
  className?: string;
  /** Height of the K in px. The ring is ~1.6× that. */
  size?: number;
}) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      aria-label="Kami — דף הבית"
      dir="ltr"
      style={{ fontSize: size } as CSSProperties}
      className={cn("focus-ring group/logo relative inline-flex items-center rounded-full", className)}
    >
      {/* הטבעת + K */}
      <span className="relative inline-flex size-[1.6em] shrink-0 items-center justify-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full p-[0.075em]",
            "bg-[conic-gradient(from_200deg,#4ade80,#22d3ee,#3b82f6,#22d3ee,#4ade80)]",
            "shadow-[0_0_0.35em_rgb(34_211_238/0.55),0_0_0.9em_rgb(59_130_246/0.3)]",
            "[mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]",
            "transition-[opacity,scale,filter] duration-500 ease-out-soft",
            "group-hover/logo:scale-[1.35] group-hover/logo:opacity-0 group-hover/logo:blur-[3px]",
            "group-focus-visible/logo:scale-[1.35] group-focus-visible/logo:opacity-0",
          )}
        />
        <LogoMark
          size={size}
          className="h-[1em] w-auto transition-transform duration-500 ease-spring group-hover/logo:scale-[1.12] group-focus-visible/logo:scale-[1.12]"
        />
      </span>

      {/* "ami" — נפתח מתוך ה-K */}
      <span
        aria-hidden
        className={cn(
          // The letters tuck 0.41em under the K's box, as in the original wordmark.
          "grid grid-cols-[0fr] transition-[grid-template-columns,margin] duration-600 ease-spring",
          "group-hover/logo:-ms-[0.41em] group-hover/logo:grid-cols-[1fr]",
          "group-focus-visible/logo:-ms-[0.41em] group-focus-visible/logo:grid-cols-[1fr]",
        )}
      >
        <span className="overflow-hidden">
          <span
            className={cn(
              "relative block h-[1.12em] w-[2.42em]",
              "-translate-x-[0.4em] opacity-0 blur-[2px] transition-[opacity,translate,filter] duration-500 ease-out-soft",
              "group-hover/logo:translate-x-0 group-hover/logo:opacity-100 group-hover/logo:blur-none",
              "group-focus-visible/logo:translate-x-0 group-focus-visible/logo:opacity-100 group-focus-visible/logo:blur-none",
            )}
          >
            <span
              className="absolute bottom-[0.02em] left-0 h-[0.727em] w-[2.31em] bg-foreground [mask:url(/brand/kami-letters.webp)_center/contain_no-repeat]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img
              src="/brand/kami-leaf.webp"
              alt=""
              draggable={false}
              className={cn(
                "absolute left-[2.08em] top-[0.125em] h-[0.346em] w-auto origin-bottom-left",
                "-rotate-45 scale-0 transition-transform delay-150 duration-500 ease-spring",
                "group-hover/logo:rotate-0 group-hover/logo:scale-100 group-focus-visible/logo:rotate-0 group-focus-visible/logo:scale-100",
              )}
            />
          </span>
        </span>
      </span>
    </Link>
  );
}
