import { createHash } from "node:crypto";
import { israelDate } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";

// Page views and "still here" pings from the browser (see SiteTracker).
// The visitor id is a hash of IP + browser + a secret that changes daily:
// no cookies, the IP isn't stored, and a visitor can't be followed across days.

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|vercel/i;

function visitorId(request: Request) {
  const ip =
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  const ua = request.headers.get("user-agent") ?? "";
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "kami";
  return createHash("sha256").update(`${secret}|${israelDate()}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOTS.test(ua)) return new Response(null, { status: 204 });

  let body: { type?: string; path?: string; ref?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : "";
  if (!path.startsWith("/")) return new Response(null, { status: 400 });

  // Only the referring site's name (not the full URL), and not ourselves.
  let ref = "";
  try {
    const host = new URL(String(body.ref ?? "")).hostname.replace(/^www\./, "");
    if (host && host !== new URL(request.url).hostname.replace(/^www\./, "")) ref = host;
  } catch {
    // no referrer
  }

  const supabase = await createClient(); // with the session, so logged-in visitors are counted as members
  const visitor = visitorId(request);
  if (body.type === "ping") await supabase.rpc("track_presence", { p_visitor: visitor, p_path: path });
  else await supabase.rpc("track_pageview", { p_visitor: visitor, p_path: path, p_referrer: ref });
  return new Response(null, { status: 204 });
}
