import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPermission, type Permission } from "./permissions";

export type AccountStatus = "active" | "locked" | "blocked";
export type AccountType = "pet_owner" | "business_owner";

export type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  account_type: AccountType;
  status: AccountStatus;
};

export type StaffContext = {
  profile: Profile;
  isOwner: boolean;
  mfaVerified: boolean;
  permissions: Set<Permission>;
};

// The signed-in user's profile, or null. Cached per request.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, account_type, status")
    .eq("id", userId)
    .single<Profile>();
  return data ?? null;
});

// Staff details for the signed-in user, or null if they are not active staff.
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const profile = await getCurrentProfile();
  if (!profile || profile.status !== "active") return null;

  const supabase = await createClient();
  const [{ data: staff }, { data: claimsData }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("is_owner, is_active")
      .eq("user_id", profile.id)
      .maybeSingle<{ is_owner: boolean; is_active: boolean }>(),
    supabase.auth.getClaims(),
  ]);
  if (!staff?.is_active) return null;

  const mfaVerified = claimsData?.claims?.aal === "aal2";

  // my_permissions() returns nothing until the session is aal2.
  const permissions = new Set<Permission>();
  if (mfaVerified) {
    const { data: rows } = await supabase.rpc("my_permissions");
    for (const key of (rows as string[] | null) ?? []) {
      if (isPermission(key)) permissions.add(key);
    }
  }

  return { profile, isOwner: staff.is_owner, mfaVerified, permissions };
});

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

// Guard for every admin page and server action. Non-staff get a 404 so the
// admin area isn't advertised; staff without 2FA go to the 2FA screen.
export async function requireStaff(): Promise<StaffContext> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");

  const staff = await getStaffContext();
  if (!staff) notFound();
  if (!staff.mfaVerified) redirect("/admin/mfa");
  return staff;
}

export async function requirePermission(
  permission: Permission,
): Promise<StaffContext> {
  const staff = await requireStaff();
  if (!staff.isOwner && !staff.permissions.has(permission)) notFound();
  return staff;
}

export async function requireOwner(): Promise<StaffContext> {
  const staff = await requireStaff();
  if (!staff.isOwner) notFound();
  return staff;
}
