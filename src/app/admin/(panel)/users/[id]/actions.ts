"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Each action: the database function authorizes and writes the audit log,
// then (where needed) the Auth Admin API does what SQL can't.

export type ActionResult = { ok?: string; error?: string };

// ~100 years. Supabase has no "forever" ban; this is the documented idiom.
const BAN_FOREVER = "876000h";

function dbError(error: PostgrestError): ActionResult {
  switch (error.code) {
    case "42501":
      return { error: "אין לך הרשאה לבצע פעולה זו על המשתמש הזה." };
    case "22023":
      return { error: "צריך לכתוב סיבה." };
    case "P0002":
      return { error: "המשתמש לא נמצא." };
    default:
      return { error: "הפעולה נכשלה. נסו שוב." };
  }
}

async function setLoginBan(userId: string, banned: boolean) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? BAN_FOREVER : "none",
  });
  return error;
}

async function begin(userId: unknown) {
  await requireStaff();
  if (!isUuid(userId)) throw new Error("invalid user id");
  return createClient();
}

function done(userId: string, ok: string): ActionResult {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok };
}

const reasonSchema = z.string().trim().max(500).optional();

export async function setUserStatus(
  userId: string,
  status: "active" | "locked" | "blocked",
  reason?: string,
): Promise<ActionResult> {
  const supabase = await begin(userId);
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { error: "הסיבה ארוכה מדי." };

  const { data: shouldBan, error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: parsedReason.data || null,
  });
  if (error) return dbError(error);

  if (await setLoginBan(userId, Boolean(shouldBan))) {
    return { error: "הסטטוס עודכן, אבל חסימת ההתחברות נכשלה. נסו שוב." };
  }

  const messages = {
    active: "החשבון פעיל",
    locked: "החשבון ננעל",
    blocked: "החשבון נחסם",
  } as const;
  return done(userId, messages[status]);
}

export async function sendPasswordReset(userId: string): Promise<ActionResult> {
  const supabase = await begin(userId);
  const { data: email, error } = await supabase.rpc("admin_authorize_password_reset", {
    p_user_id: userId,
  });
  if (error) return dbError(error);

  // Sent through the admin client so the link doesn't depend on the staff
  // member's browser session. /auth/callback forwards it to /auth/confirm.
  const admin = createAdminClient();
  const { error: mailError } = await admin.auth.resetPasswordForEmail(email as string, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (mailError) {
    if (mailError.code === "email_address_not_authorized") {
      return {
        error: "שירות המייל עדיין לא מוגדר לשליחה לכל המשתמשים (צריך לחבר SMTP ב-Supabase).",
      };
    }
    if (mailError.code?.startsWith("over_")) {
      return { error: "נשלחו יותר מדי מיילים. נסו שוב בעוד כמה דקות." };
    }
    return { error: "שליחת המייל נכשלה." };
  }
  return done(userId, "נשלח מייל לאיפוס סיסמה");
}

const messageSchema = z.object({
  subject: z.string().trim().min(1, "חסרה כותרת").max(200, "הכותרת ארוכה מדי"),
  body: z.string().trim().min(1, "חסר תוכן").max(5000, "ההודעה ארוכה מדי"),
});

export async function sendMessage(
  userId: string,
  input: { subject: string; body: string },
): Promise<ActionResult> {
  const supabase = await begin(userId);
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase.rpc("admin_send_message", {
    p_user_id: userId,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
  });
  if (error) return dbError(error);
  return done(userId, "ההודעה נשלחה");
}

export async function softDeleteUser(userId: string, reason?: string): Promise<ActionResult> {
  const supabase = await begin(userId);
  const { error } = await supabase.rpc("admin_soft_delete_user", {
    p_user_id: userId,
    p_reason: reason?.trim() || null,
  });
  if (error) return dbError(error);

  if (await setLoginBan(userId, true)) {
    return { error: "המשתמש סומן כמחוק, אבל חסימת ההתחברות נכשלה. נסו שוב." };
  }
  return done(userId, "המשתמש נמחק");
}

export async function restoreUser(userId: string): Promise<ActionResult> {
  const supabase = await begin(userId);
  const { data: stillBanned, error } = await supabase.rpc("admin_restore_user", {
    p_user_id: userId,
  });
  if (error) return dbError(error);

  if (await setLoginBan(userId, Boolean(stillBanned))) {
    return { error: "המשתמש שוחזר, אבל עדכון ההתחברות נכשל. נסו שוב." };
  }
  return done(userId, "המשתמש שוחזר");
}

export async function deleteUserPermanently(
  userId: string,
  confirmation: string,
): Promise<ActionResult> {
  const supabase = await begin(userId);
  const { data: target } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single<{ email: string | null }>();
  if (!target?.email || confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
    return { error: "המייל שהוקלד לא תואם." };
  }

  const { error } = await supabase.rpc("admin_authorize_permanent_delete", {
    p_user_id: userId,
  });
  if (error) return dbError(error);

  // Deleting the auth user cascades to the profile and everything that references it.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return { error: "המחיקה נכשלה. נסו שוב." };

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
