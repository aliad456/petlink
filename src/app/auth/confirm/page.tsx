"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/client";

// Handles auth links that carry the session in the URL fragment
// (#access_token=…), e.g. password resets sent by staff from the admin panel.
// The fragment never reaches the server, so this has to run in the browser.
export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=link");
      return;
    }

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        // Drop the tokens from the address bar and history.
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(error ? "/login?error=link" : next);
        router.refresh();
      });
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <Spinner className="size-8 text-brand" />
    </main>
  );
}
