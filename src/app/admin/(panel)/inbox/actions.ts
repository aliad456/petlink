"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export async function setContactStatus(id: string, status: "new" | "handled"): Promise<{ error?: string }> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_contact_status", { p_id: id, p_status: status });
  if (error) return { error: error.code === "42501" ? "אין לך הרשאה לפעולה הזו." : "הפעולה נכשלה. נסו שוב." };
  revalidatePath("/admin/inbox");
  return {};
}
