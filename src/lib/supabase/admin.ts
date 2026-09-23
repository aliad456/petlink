import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Bypasses RLS. Use only inside server code that has already checked
// permissions (e.g. via requirePermission) and only for what RLS can't do,
// such as auth admin operations (ban user, send password reset).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY.");
  }
  return createClient(supabaseUrl(), secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
