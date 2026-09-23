// Mirrors public.permissions (supabase/migrations/*_reference_data.sql).
// The database is the source of truth for enforcement; this list exists for
// type-safety in server code and UI.
export const PERMISSIONS = [
  "dashboard.view",
  "audit.view",
  "users.view",
  "users.lock",
  "users.block",
  "users.reset_password",
  "users.message",
  "users.delete",
  "businesses.view",
  "businesses.approve",
  "businesses.edit",
  "businesses.feature",
  "businesses.remove",
  "reviews.moderate",
  "adoption.manage",
  "catalog.manage",
  "banners.manage",
  "banners.reports",
  "subscriptions.view",
  "coupons.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
