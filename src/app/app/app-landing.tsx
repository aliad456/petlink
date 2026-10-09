"use client";

import { BellRing, MapPin, Stethoscope } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/components/ui";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-links";

type Device = "android" | "ios" | "other" | "app" | "server";

function device(): Device {
  const ua = navigator.userAgent;
  if (/KamiApp/.test(ua)) return "app";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

const noop = () => () => {};

const PERKS = [
  { icon: Stethoscope, text: "וטרינר פתוח עכשיו, הכי קרוב אליכם" },
  { icon: BellRing, text: "תזכורת לפני כל חיסון, ישר לטלפון" },
  { icon: MapPin, text: "מאלפים, פנסיונים ומספרות באזור שלכם" },
];

// One screen, no scrolling: the text and the store badges next to the phone
// (on phones the phone sits beside the perks). Light, in the site's colours.
export function AppLanding() {
  const router = useRouter();
  const d = useSyncExternalStore(noop, device, () => "server" as const);

  // Already in the app: nothing to download.
  useEffect(() => {
    if (d === "app") router.replace("/");
  }, [d, router]);

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[#f3f8fb] px-5 py-6 text-[#0b1215]">
      <div aria-hidden className="absolute -right-32 -top-32 -z-10 size-[28rem] rounded-full bg-cyan-300/40 blur-[100px]" />
      <div aria-hidden className="absolute -bottom-40 -left-24 -z-10 size-[30rem] rounded-full bg-emerald-300/35 blur-[110px]" />
      <div aria-hidden className="absolute left-1/3 top-1/4 -z-10 size-[22rem] rounded-full bg-blue-300/25 blur-[110px]" />

      <div className="flex w-full max-w-5xl items-center gap-12">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <LogoMark size={40} />
          <h1 className="animate-rise text-[2.1rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            כל מה שהחיה שלך צריכה.{" "}
            <span className="bg-gradient-to-l from-emerald-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              במקום אחד.
            </span>
          </h1>

          <div className="flex items-center gap-4">
            <ul className="animate-rise flex min-w-0 flex-1 flex-col gap-2" style={{ "--i": 1 } as React.CSSProperties}>
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 rounded-2xl bg-white/80 px-3.5 py-2.5 shadow-sm ring-1 ring-black/5">
                  <Icon className="size-5 shrink-0 text-cyan-600" />
                  <span className="text-sm font-medium sm:text-base">{text}</span>
                </li>
              ))}
            </ul>
            {/* Phones: the phone beside the perks */}
            <Phone className="w-28 shrink-0 md:hidden" />
          </div>

          <div className="animate-rise flex flex-wrap gap-3" style={{ "--i": 2 } as React.CSSProperties}>
            {d !== "ios" && <PlayBadge />}
            {d !== "android" && <AppStoreBadge />}
          </div>
          <Link href="/" className="focus-ring self-start rounded-lg text-sm font-semibold text-[#45606d] underline underline-offset-4 hover:text-[#0b1215]">
            להמשיך לאתר בלי להוריד
          </Link>
        </div>

        <Phone className="hidden w-72 shrink-0 md:block lg:w-80" />
      </div>
    </main>
  );
}

function Phone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-rise rotate-[-3deg] rounded-[2rem] bg-[#0b1220] p-1.5 shadow-[0_30px_70px_rgba(15,40,60,0.28)] md:rounded-[2.8rem] md:p-2.5",
        className,
      )}
      style={{ "--i": 3 } as React.CSSProperties}
    >
      <div className="overflow-hidden rounded-[1.6rem] md:rounded-[2.3rem]">
        <Image src="/app/screen-home.webp" alt="מסך הבית של Kami" width={600} height={1304} sizes="(min-width: 768px) 320px, 112px" priority />
      </div>
    </div>
  );
}

// Store badges in the official style (black, rounded, store logo + two lines).
const BADGE = "focus-ring pressable flex h-[52px] items-center gap-2.5 rounded-xl bg-black pe-4 ps-3 text-white ring-1 ring-[#a6a6a6]";

function PlayBadge() {
  return (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener" dir="ltr" className={BADGE} aria-label="Get it on Google Play">
      <svg viewBox="0 0 28 30" className="h-7 w-[26px]" aria-hidden>
        <path d="M1.2.6 15.6 15 1.2 29.4C.7 29.1.4 28.5.4 27.8V2.2C.4 1.5.7.9 1.2.6z" fill="#00d7fe" />
        <path d="m20.4 19.8-4.8-4.8 4.8-4.8 5.8 3.3c1.6.9 1.6 2.4 0 3.3z" fill="#ffce00" />
        <path d="M20.4 19.8 15.6 15 1.2 29.4c.5.5 1.4.6 2.4 0z" fill="#ff3a44" />
        <path d="M20.4 10.2 3.6.6C2.6 0 1.7.1 1.2.6L15.6 15z" fill="#00f076" />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium tracking-wide">GET IT ON</span>
        <span className="mt-0.5 text-[19px] font-semibold tracking-tight">Google Play</span>
      </span>
    </a>
  );
}

function AppStoreBadge() {
  const content = (
    <>
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <path
          fill="currentColor"
          d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.8 0 0-2.4-.9-2.4-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"
        />
      </svg>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-medium">{APP_STORE_URL ? "Download on the" : "Coming soon to the"}</span>
        <span className="mt-0.5 text-[19px] font-semibold tracking-tight">App Store</span>
      </span>
    </>
  );
  return APP_STORE_URL ? (
    <a href={APP_STORE_URL} target="_blank" rel="noopener" dir="ltr" className={BADGE} aria-label="Download on the App Store">
      {content}
    </a>
  ) : (
    <span dir="ltr" className={cn(BADGE, "pointer-events-none opacity-55")} aria-label="בקרוב ב-App Store">
      {content}
    </span>
  );
}
