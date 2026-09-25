"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error?: string; message?: string };

const schema = z.object({
  full_name: z.string().trim().min(2, "הזינו שם מלא").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^(\+972|0)[\d\s-]{8,13}$/, "מספר טלפון לא תקין")
    .or(z.literal("")),
});

export async function updateProfile(
  _: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const profile = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
    .eq("id", profile.id);
  if (error) return { error: "השמירה נכשלה. נסו שוב." };

  revalidatePath("/", "layout"); // the header shows the first name
  return { message: "הפרטים נשמרו" };
}

export async function markMessagesRead(): Promise<void> {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("user_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
}

// Opt in/out of marketing email (Communications Law §30A: opting out must be easy).
export async function setMarketingConsent(consent: boolean): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_marketing_consent", { p_consent: consent });
  if (error) return { error: "השמירה נכשלה. נסו שוב." };
  revalidatePath("/account");
  return {};
}
