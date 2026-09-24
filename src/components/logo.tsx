import Link from "next/link";
import { cn } from "./ui";

// The mark: a map pin (it's a directory) with a paw inside.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-9", className)}>
      <defs>
        <linearGradient id="logo-pin" x1="6" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
      </defs>
      <path
        d="M16 1.5c-6.4 0-11.5 5-11.5 11.3 0 8.2 9.6 16.7 10.5 17.4a1.5 1.5 0 0 0 2 0c.9-.7 10.5-9.2 10.5-17.4C27.5 6.5 22.4 1.5 16 1.5z"
        fill="url(#logo-pin)"
      />
      <path
        d="M16 1.5c-6.4 0-11.5 5-11.5 11.3"
        fill="none"
        stroke="#fff"
        strokeOpacity=".35"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <g fill="#fff">
        <ellipse cx="16" cy="15.4" rx="3.7" ry="3.1" />
        <circle cx="11.3" cy="11" r="1.55" />
        <circle cx="14.1" cy="8.1" r="1.6" />
        <circle cx="17.9" cy="8.1" r="1.6" />
        <circle cx="20.7" cy="11" r="1.55" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      className={cn("focus-ring group inline-flex items-center gap-2 rounded-xl", className)}
      aria-label="PetLink — דף הבית"
    >
      <LogoMark className="transition-transform duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:rotate-[-6deg]" />
      <span dir="ltr" className="text-[1.35rem] font-extrabold tracking-tight">
        Pet<span className="text-brand-strong dark:text-brand">Link</span>
      </span>
    </Link>
  );
}
