import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Saves a business to the user's favorites, then goes back to where they were.
// It's the `next` of the "save this business" sign-up prompt (FavoriteButton),
// so a guest who taps ❤️ and signs up finds the business already saved.
// A page rather than a route handler so the redirect after sign-in updates the
// address bar. Nothing links here directly, so it's never prefetched.
// RLS limits the row to the signed-in user and to public businesses.
export const dynamic = "force-dynamic";

export default async function SavePage({ params, searchParams }: PageProps<"/save/[businessId]">) {
  const [{ businessId }, sp] = await Promise.all([params, searchParams]);
  const back = safeNextPath(sp.back, "/account");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/save/${businessId}?back=${encodeURIComponent(back)}`)}`);
  if (isUuid(businessId)) {
    await supabase.from("favorites").upsert({ user_id: user.id, business_id: businessId }, { ignoreDuplicates: true });
  }
  redirect(back);
}
