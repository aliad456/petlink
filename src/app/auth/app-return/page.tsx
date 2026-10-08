"use client";

import { useEffect, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/logo";
import { buttonClass, Spinner } from "@/components/ui";

// "Continue with Google" from the Android app. Google blocks sign-in inside the app's
// WebView, so the app opens Google in the phone's browser, and Google sends the browser
// back here (instead of /auth/callback). The login has to finish inside the app, where
// the sign-in started (the PKCE verifier is in the app's cookies), so this page hands
// the same parameters back to the app. If the phone already opened this page in the
// app (Android App Links), go straight on.
const PACKAGE = "il.co.heykami.app";

export default function AppReturnPage() {
  // null on the server and inside the app.
  const href = useSyncExternalStore(noop, intentUrl, () => null);

  useEffect(() => {
    if (/KamiApp/.test(navigator.userAgent)) window.location.replace(`/auth/callback${window.location.search}`);
    else window.location.href = intentUrl()!;
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <LogoMark size={56} />
      {href ? (
        <>
          <p className="text-lg font-bold">ההתחברות עם Google הצליחה</p>
          <a href={href} className={buttonClass({ size: "lg" })}>
            חזרה לאפליקציה
          </a>
        </>
      ) : (
        <Spinner className="size-8 text-brand" />
      )}
    </main>
  );
}

const noop = () => () => {};

function intentUrl() {
  if (/KamiApp/.test(navigator.userAgent)) return null;
  const { host, search } = window.location;
  return `intent://${host}/auth/callback${search}#Intent;scheme=https;package=${PACKAGE};end`;
}
