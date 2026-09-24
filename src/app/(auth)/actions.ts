"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirect";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  message?: string;
  // Echoed back so fields survive React's form reset after a failed submit.
  fields?: Record<string, string>;
};

function echo(formData: FormData, ...names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, String(formData.get(n) ?? "")]));
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "המייל או הסיסמה שגויים.",
  email_not_confirmed: "צריך לאשר את כתובת המייל. בדקו את תיבת הדואר.",
  user_already_exists: "כבר קיים חשבון עם המייל הזה.",
  weak_password: "הסיסמה חלשה מדי. בחרו סיסמה ארוכה יותר.",
  same_password: "הסיסמה החדשה זהה לישנה.",
  over_email_send_rate_limit: "נשלחו יותר מדי מיילים. נסו שוב בעוד כמה דקות.",
  over_request_rate_limit: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.",
  user_banned: "החשבון נעול או חסום. לפרטים פנו לשירות הלקוחות.",
};

function authError(code: string | undefined): FormState {
  return { error: (code && AUTH_ERRORS[code]) || "משהו השתבש. נסו שוב." };
}

const email = z.email("כתובת מייל לא תקינה").trim().toLowerCase();
const password = z.string().min(8, "סיסמה של 8 תווים לפחות");

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, password: z.string().min(1, "הזינו סיסמה") })
    .safeParse(Object.fromEntries(formData));
  const fields = echo(formData, "email");
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ...authError(error.code), fields };

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({
      full_name: z.string().trim().min(2, "הזינו שם מלא"),
      email,
      password,
      account_type: z.enum(["pet_owner", "business_owner"]),
      terms: z.literal("on", { error: "יש לאשר את תנאי השימוש ומדיניות הפרטיות" }),
    })
    .safeParse(Object.fromEntries(formData));
  const fields = echo(formData, "full_name", "email", "account_type");
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { full_name, account_type } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name, account_type },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/account`,
    },
  });
  if (error) return { ...authError(error.code), fields };

  // With email confirmation off (local dev) the user is signed in immediately.
  if (data.session) redirect("/account");

  return { message: "שלחנו לכם מייל לאישור החשבון. לחצו על הקישור כדי להמשיך." };
}

export async function requestPasswordReset(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error?.code?.startsWith("over_")) return authError(error.code);

  // Same answer whether or not the address exists, so accounts can't be probed.
  return { message: "אם קיים חשבון עם המייל הזה, שלחנו אליו קישור לאיפוס סיסמה." };
}

export async function updatePassword(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== formData.get("confirm")) return { error: "הסיסמאות אינן תואמות" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return authError(error.code);

  redirect("/account");
}
