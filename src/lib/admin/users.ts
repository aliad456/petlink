import "server-only";
import type { Tone } from "@/components/ui";
import type { AccountStatus, AccountType } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  account_type: AccountType;
  status: AccountStatus;
  created_at: string;
  last_sign_in_at: string | null;
  deleted_at: string | null;
  is_staff: boolean;
  is_owner: boolean;
  total_count: number;
};

export type AdminUserDetails = Omit<AdminUserRow, "total_count"> & {
  status_reason: string | null;
  email_confirmed_at: string | null;
  staff_role: string | null;
  can_manage: boolean;
};

export type HistoryEntry = {
  id: number;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string; email: string | null } | null;
};

export const STATUS_FILTERS = ["active", "locked", "blocked", "deleted"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];
export const TYPE_FILTERS = ["pet_owner", "business_owner", "staff"] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];

export const PAGE_SIZE = 30;

export const STATUS_META: Record<AccountStatus | "deleted", { label: string; tone: Tone }> = {
  active: { label: "פעיל", tone: "success" },
  locked: { label: "נעול", tone: "warning" },
  blocked: { label: "חסום", tone: "danger" },
  deleted: { label: "נמחק", tone: "neutral" },
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  pet_owner: "בעל/ת חיית מחמד",
  business_owner: "בעל/ת עסק",
};

export const ACTION_LABEL: Record<string, string> = {
  "owner.bootstrap": "הוגדר כבעלים",
  "user.lock": "נעילה",
  "user.unlock": "שחרור נעילה",
  "user.block": "חסימה",
  "user.unblock": "ביטול חסימה",
  "user.delete": "מחיקה",
  "user.restore": "שחזור",
  "user.delete_permanent": "מחיקה לצמיתות",
  "user.reset_password": "נשלח מייל לאיפוס סיסמה",
  "user.message": "נשלחה הודעה",
};

export async function listUsers(params: {
  query?: string;
  status?: StatusFilter;
  type?: TypeFilter;
  page: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", {
    p_query: params.query || null,
    p_status: params.status ?? null,
    p_type: params.type ?? null,
    p_limit: PAGE_SIZE,
    p_offset: (params.page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as AdminUserRow[];
  return { rows, total: rows[0]?.total_count ?? 0 };
}

export async function getUser(id: string): Promise<AdminUserDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_user", { p_user_id: id });
  if (error) throw error;
  return ((data ?? []) as AdminUserDetails[])[0] ?? null;
}

// Audit entries about this user. RLS returns nothing without audit.view.
export async function getUserHistory(id: string): Promise<HistoryEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, details, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, email)")
    .eq("target_type", "user")
    .eq("target_id", id)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<HistoryEntry[]>();
  return data ?? [];
}

export function displayName(user: { full_name: string; email: string | null }) {
  return user.full_name || user.email || "ללא שם";
}
