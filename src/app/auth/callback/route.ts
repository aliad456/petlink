import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Landing point for links in auth emails (confirm signup, password reset).
// Supports the PKCE `code` flow and the `token_hash` email template flow.
// Links with neither carry the session in the URL fragment (implicit flow),
// which only the browser can read: forward to /auth/confirm. Browsers keep the
// fragment across redirects.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!code && !tokenHash && !searchParams.has("error")) {
    const confirm = new URL("/auth/confirm", origin);
    confirm.searchParams.set("next", next);
    return NextResponse.redirect(confirm);
  }

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(new URL(ok ? next : "/login?error=link", origin));
}
