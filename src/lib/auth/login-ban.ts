import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// ~100 years. Supabase has no "forever" ban; this is the documented idiom.
const BAN_FOREVER = "876000h";

// Blocks (or allows) signing in through Supabase Auth. Call only after the
// matching public.admin_* function authorized and logged the change.
// hours: a temporary lock; Auth lifts it by itself when the time is up.
export async function setLoginBan(userId: string, banned: boolean, hours?: number | null) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: !banned ? "none" : hours ? `${hours}h` : BAN_FOREVER,
  });
  return error;
}
