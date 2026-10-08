"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { toast } from "@/components/toast";
import { buttonClass, cn } from "@/components/ui";
import { TERMS_VERSION } from "@/lib/legal";
import type { SignupSource } from "@/lib/signup";
import { createClient } from "@/lib/supabase/client";

// "Continue with Google" (Supabase OAuth). Google's own address is already verified,
// so the account is ready at once (handle_new_user marks it). /auth/callback stores
// the terms consent shown under the button and where the sign-up came from.
//
// Google blocks sign-in inside embedded WebViews ("disallowed_useragent"):
// - Android app ("KamiApp/" in the user agent): the app opens Google's page in the
//   phone's browser, which comes back to /auth/app-return and hands the login back
//   to the app (see that page).
// - iPhone app ("KamiApp-iOS/"): not shown. Apple also requires Sign in with Apple
//   wherever a third-party login is offered (App Store guideline 4.8).
export function GoogleButton({
  next,
  source,
  divider = false,
  className,
}: {
  next: string;
  source: SignupSource;
  // "או עם מייל" under the button, when an email form follows.
  divider?: boolean;
  className?: string;
}) {
  // Hidden on the server and in the iPhone app; shown after hydration.
  const app = useSyncExternalStore(noop, appKind, () => "server" as const);
  const [pending, setPending] = useState(false);
  if (app === "server" || app === "ios") return null;

  async function go() {
    setPending(true);
    const back = new URL(app === "android" ? "/auth/app-return" : "/auth/callback", window.location.origin);
    back.searchParams.set("next", next);
    back.searchParams.set("src", source);
    back.searchParams.set("terms", TERMS_VERSION);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: back.toString(), queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setPending(false);
      toast.error("ההתחברות עם Google לא זמינה כרגע. אפשר להירשם עם מייל.");
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className={buttonClass({
          variant: "ghost",
          size: "lg",
          className: "w-full border border-[#dadce0] !bg-white !text-[#1f1f1f] shadow-sm hover:!bg-[#f8fafd]",
        })}
      >
        <GoogleG />
        המשך עם Google
      </button>
      <p className="text-center text-xs leading-relaxed text-muted">
        בהמשך עם Google אני מסכים/ה ל
        <Link href="/terms" target="_blank" className="underline underline-offset-2">
          תנאי השימוש
        </Link>{" "}
        ול
        <Link href="/privacy" target="_blank" className="underline underline-offset-2">
          מדיניות הפרטיות
        </Link>
        , ומאשר/ת שאני בן/בת 18 ומעלה.
      </p>
      {divider && (
        <div className="mt-2 flex items-center gap-3 text-xs text-muted" aria-hidden>
          <span className="h-px flex-1 bg-[var(--glass-border)]" />
          או עם מייל
          <span className="h-px flex-1 bg-[var(--glass-border)]" />
        </div>
      )}
    </div>
  );
}

const noop = () => () => {};

function appKind() {
  const ua = navigator.userAgent;
  return /KamiApp-iOS\//.test(ua) ? "ios" : /KamiApp\//.test(ua) ? "android" : "web";
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
