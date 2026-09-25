import { createPublicClient } from "@/lib/supabase/public";
import { isUuid } from "@/lib/uuid";

// Called by the browser (sendBeacon) when an ad has actually been seen.
// The database only counts ads that are running today.
export async function POST(request: Request) {
  let ids: unknown;
  try {
    ids = (await request.json())?.ids;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!Array.isArray(ids)) return new Response(null, { status: 400 });
  const valid = ids.filter((id): id is string => typeof id === "string" && isUuid(id)).slice(0, 10);
  if (valid.length) await createPublicClient().rpc("track_ad_impressions", { p_ids: valid });
  return new Response(null, { status: 204 });
}
