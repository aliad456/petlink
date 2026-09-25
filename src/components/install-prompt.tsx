"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "./logo";
import { Button } from "./ui";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const VISITS = "kami_visits";
const DISMISSED = "kami_install_dismissed";
const QUIET_DAYS = 30;

// "Add Kami to your home screen", from the second visit on. Android / desktop
// Chrome get a real install button; iPhone gets the Share → Add steps (Safari
// has no install API). Never shown inside the installed app.
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let eligible = false;
    try {
      const dismissed = Number(localStorage.getItem(DISMISSED) ?? 0);
      if (Date.now() - dismissed < QUIET_DAYS * 86_400_000) return;
      // count visits, once per browser session
      if (!sessionStorage.getItem(VISITS)) {
        sessionStorage.setItem(VISITS, "1");
        localStorage.setItem(VISITS, String(Number(localStorage.getItem(VISITS) ?? 0) + 1));
      }
      eligible = Number(localStorage.getItem(VISITS) ?? 0) >= 2;
    } catch {
      return;
    }
    if (!eligible) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const t = isIos
      ? setTimeout(() => {
          setIos(true);
          setShow(true);
        }, 2500)
      : undefined;
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED, String(Date.now()));
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="התקנת Kami"
      className="glass-strong animate-rise fixed inset-x-4 bottom-20 z-[80] mx-auto flex max-w-sm flex-col gap-3 rounded-[1.5rem] border border-[var(--glass-border)] p-4 shadow-2xl sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--glass-bg-strong)] shadow">
          <LogoMark size={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Kami על המסך הראשי</p>
          <p className="text-sm text-muted">נפתח כמו אפליקציה, בלחיצה אחת. בלי חנות אפליקציות.</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="לא עכשיו"
          className="pressable focus-ring inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[var(--glass-bg)]"
        >
          <X className="size-4" />
        </button>
      </div>

      {ios ? (
        <ol className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center gap-2">
            <span className="font-bold text-brand">1.</span> לוחצים על
            <Share className="size-4 text-brand" aria-label="שיתוף" /> (שיתוף) בתחתית המסך
          </li>
          <li className="flex items-center gap-2">
            <span className="font-bold text-brand">2.</span> בוחרים
            <SquarePlus className="size-4 text-brand" aria-hidden /> ״הוספה למסך הבית״
          </li>
        </ol>
      ) : (
        <Button
          onClick={async () => {
            if (!event) return;
            await event.prompt();
            await event.userChoice.catch(() => null);
            setShow(false);
          }}
        >
          <Download className="size-4" />
          התקנת Kami
        </Button>
      )}
    </div>
  );
}
