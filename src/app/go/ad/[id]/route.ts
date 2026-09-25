import { createPublicClient } from "@/lib/supabase/public";
import { isUuid } from "@/lib/uuid";

// Ad clicks go through here: counted, then redirected to the advertiser.
export async function GET(request: Request, ctx: RouteContext<"/go/ad/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.redirect(new URL("/", request.url), 302);
  const { data } = await createPublicClient().rpc("track_ad_click", { p_id: id });
  const link = typeof data === "string" && /^https?:\/\//.test(data) ? data : new URL("/", request.url).toString();
  return new Response(null, { status: 302, headers: { Location: link, "Cache-Control": "no-store" } });
}
