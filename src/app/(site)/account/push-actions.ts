"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { notifyUser } from "@/lib/push/send";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  kind: z.enum(["web", "fcm"]),
  endpoint: z.string().min(10).max(1000),
  p256dh: z.string().max(200).nullable(),
  auth: z.string().max(100).nullable(),
  userAgent: z.string().max(300).nullable(),
});

/** Saves this device for the signed-in user; `test` sends a hello so they see it works. */
export async function savePushSubscription(input: z.input<typeof schema>, test = false): Promise<{ error?: string }> {
  const profile = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "לא הצלחנו להפעיל התראות במכשיר הזה." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_kind: d.kind,
    p_endpoint: d.endpoint,
    p_p256dh: d.p256dh,
    p_auth: d.auth,
    p_user_agent: d.userAgent,
  });
  if (error) return { error: "לא הצלחנו להפעיל התראות. נסו שוב." };
  if (test) {
    await notifyUser(profile.id, {
      title: "ההתראות פועלות ✅",
      body: "מעכשיו נעדכן אותך כאן על תורים ועל דברים חשובים.",
      url: "/account",
      tag: "push-test",
    });
  }
  return {};
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
