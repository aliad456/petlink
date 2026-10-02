"use client";

import { Bell, BellOff, BellRing, Share, SquarePlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/(site)/account/push-actions";
import { toast } from "./toast";
import { Button, cn } from "./ui";

// Turn notifications on for this device.
// - In the Android app (window.KamiApp, see android/…/MainActivity.java): the app asks
//   for permission and hands back its Firebase token.
// - In a browser: Web Push through /sw.js. On iPhone this only works once Kami was
//   added to the home screen (iOS 16.4+), so there we show those steps instead.

type Bridge = { pushState(): string; requestPush(): void; pushToken(): string };
declare global {
  interface Window {
    KamiApp?: Bridge;
  }
}

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "denied";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function detect(): State {
  const app = window.KamiApp;
  if (app) {
    const s = app.pushState();
    return s === "granted" ? "on" : s === "denied" ? "denied" : s === "unavailable" ? "unsupported" : "off";
  }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !standalone) return "ios-install";
  if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return "off"; // refined below from the actual subscription
}

export function PushToggle({ compact = false, hint }: { compact?: boolean; hint?: string }) {
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    const s = detect();
    const app = window.KamiApp;
    if (app && s === "on") {
      // Keep the app's token tied to whoever is signed in now.
      const token = app.pushToken();
      if (token) savePushSubscription({ kind: "fcm", endpoint: token, p256dh: null, auth: null, userAgent: navigator.userAgent });
    }
    if (!app && s === "off") {
      navigator.serviceWorker
        .getRegistration("/sw.js")
        .then((reg) => reg?.pushManager.getSubscription())
        .then((sub) => live && setState(sub && Notification.permission === "granted" ? "on" : "off"))
        .catch(() => live && setState("off"));
    } else {
      queueMicrotask(() => live && setState(s));
    }
    return () => {
      live = false;
    };
  }, []);

  const enable = () =>
    start(async () => {
      const app = window.KamiApp;
      if (app) {
        const token = await new Promise<string | null>((resolve) => {
          const done = (e: Event) => {
            window.removeEventListener("kami-push", done);
            resolve((e as CustomEvent<{ token: string | null }>).detail?.token ?? null);
          };
          window.addEventListener("kami-push", done);
          app.requestPush();
          setTimeout(() => resolve(null), 20_000);
        });
        if (!token) {
          setState(app.pushState() === "denied" ? "denied" : "off");
          return void toast.error("ההתראות לא הופעלו.");
        }
        const r = await savePushSubscription({ kind: "fcm", endpoint: token, p256dh: null, auth: null, userAgent: navigator.userAgent }, true);
        if (r.error) return void toast.error(r.error);
        setState("on");
        return void toast.success("ההתראות פועלות");
      }
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID!) }));
        const json = sub.toJSON();
        const r = await savePushSubscription(
          { kind: "web", endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? null, auth: json.keys?.auth ?? null, userAgent: navigator.userAgent },
          true,
        );
        if (r.error) return void toast.error(r.error);
        setState("on");
        toast.success("ההתראות פועלות");
      } catch {
        toast.error("לא הצלחנו להפעיל התראות בדפדפן הזה.");
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker?.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("ההתראות כבויות במכשיר הזה");
    });

  if (state === "loading" || (compact && (state === "on" || state === "unsupported"))) return null;

  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl bg-[var(--glass-bg)] p-3", compact && "animate-rise")}>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
          {state === "on" ? <BellRing className="size-5" /> : state === "denied" ? <BellOff className="size-5" /> : <Bell className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {state === "on" ? "ההתראות פועלות במכשיר הזה" : state === "denied" ? "ההתראות חסומות" : "התראות בטלפון"}
          </span>
          <span className="block text-sm text-muted">
            {state === "denied"
              ? "אפשר לאשר אותן בהגדרות של הטלפון או הדפדפן, ואז לנסות שוב."
              : state === "unsupported"
                ? "הדפדפן הזה לא תומך בהתראות. באפליקציה של Kami זה עובד."
                : (hint ?? "תור חדש, תזכורת יום לפני, ביטולים ושינויים.")}
          </span>
        </span>
        {state === "off" && (
          <Button size="sm" loading={pending} onClick={enable}>
            הפעלה
          </Button>
        )}
        {state === "on" && !window.KamiApp && (
          <Button size="sm" variant="ghost" loading={pending} onClick={disable}>
            כיבוי
          </Button>
        )}
      </div>
      {state === "ios-install" && (
        <p className="flex flex-wrap items-center gap-1 text-sm text-muted">
          באייפון: לחצו על <Share className="inline size-4" /> שיתוף ← <SquarePlus className="inline size-4" /> ״הוספה למסך הבית״, פתחו
          את Kami משם והפעילו כאן.
        </p>
      )}
    </div>
  );
}
