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

// Dark brand page (same look as the share image), the same in light and dark mode.
export function AppLanding() {
  const router = useRouter();
  const d = useSyncExternalStore(noop, device, () => "server" as const);

  // Already in the app: nothing to download.
  useEffect(() => {
    if (d === "app") router.replace("/");
  }, [d, router]);

  const showPlay = d !== "ios";
  const showApple = d !== "android";

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-[#050b17] px-5 pb-10 pt-10 text-white">
      <div aria-hidden className="absolute -left-40 -top-40 -z-10 size-[30rem] rounded-full bg-sky-500/40 blur-[110px]" />
      <div aria-hidden className="absolute -bottom-40 left-1/3 -z-10 size-[28rem] rounded-full bg-emerald-500/35 blur-[110px]" />
      <div aria-hidden className="absolute -right-40 top-1/3 -z-10 size-[24rem] rounded-full bg-blue-600/30 blur-[110px]" />

      <LogoMark size={44} />
      <h1 className="animate-rise mt-6 text-center text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
        כל מה שהחיה שלך צריכה.
        <br />
        <span className="bg-gradient-to-l from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          במקום אחד.
        </span>
      </h1>

      <ul className="animate-rise mt-6 flex w-full max-w-sm flex-col gap-2.5" style={{ "--i": 1 } as React.CSSProperties}>
        {PERKS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/10">
            <Icon className="size-5 shrink-0 text-cyan-300" />
            <span className="text-[15px] font-medium text-slate-100">{text}</span>
          </li>
        ))}
      </ul>

      <div className="animate-rise mt-7 flex w-full max-w-sm flex-col gap-3" style={{ "--i": 2 } as React.CSSProperties}>
        {showPlay && (
          <StoreButton href={PLAY_STORE_URL} store="Google Play" icon={<PlayIcon />} primary={d === "android"} />
        )}
        {showApple &&
          (APP_STORE_URL ? (
            <StoreButton href={APP_STORE_URL} store="App Store" icon={<AppleIcon />} primary={d === "ios"} />
          ) : (
            <span className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-white/[0.06] text-sm font-semibold text-slate-300 ring-1 ring-white/10">
              <AppleIcon />
              בקרוב ב־App Store
            </span>
          ))}
        <Link
          href="/"
          className="focus-ring mt-1 rounded-xl py-2 text-center text-sm font-semibold text-slate-300 underline underline-offset-4 hover:text-white"
        >
          להמשיך לאתר בלי להוריד
        </Link>
      </div>

      <div
        className="animate-rise relative mt-8 w-56 rotate-[-4deg] rounded-[2.4rem] bg-[#0b1220] p-2 shadow-[0_0_0_1.5px_rgba(255,255,255,0.14),0_30px_80px_rgba(0,0,0,0.6),0_0_90px_rgba(34,211,238,0.25)]"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <div className="overflow-hidden rounded-[2rem]">
          <Image src="/app/screen-home.webp" alt="מסך הבית של Kami" width={600} height={1304} sizes="224px" priority />
        </div>
      </div>
    </main>
  );
}

function StoreButton({ href, store, icon, primary }: { href: string; store: string; icon: React.ReactNode; primary: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={cn(
        "focus-ring pressable flex h-14 items-center justify-center gap-3 rounded-2xl text-base font-bold",
        primary
          ? "bg-gradient-to-l from-emerald-500 via-cyan-500 to-blue-500 text-white shadow-[0_12px_32px_rgba(6,182,212,0.35)]"
          : "bg-white text-[#0b1215]",
      )}
    >
      {icon}
      <span>
        הורדה מ־<span dir="ltr">{store}</span>
      </span>
    </a>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M4 2.7v18.6c0 .5.5.8.9.6L21 12.6c.4-.3.4-.9 0-1.2L4.9 2.1c-.4-.2-.9.1-.9.6z" fill="currentColor" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.8 0 0-2.4-.9-2.4-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"
      />
    </svg>
  );
}
