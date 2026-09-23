import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { isPermission } from "@/lib/auth/permissions";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "פאנל ניהול" };

type PermissionRow = { key: string; label: string; group_key: string };

export default async function AdminHomePage() {
  const staff = await requireStaff();
  const supabase = await createClient();
  const { data: catalog } = await supabase
    .from("permissions")
    .select("key, label, group_key")
    .order("sort_order")
    .returns<PermissionRow[]>();

  const mine = (catalog ?? []).filter(
    (p) => staff.isOwner || (isPermission(p.key) && staff.permissions.has(p.key)),
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">
        שלום {staff.profile.full_name || staff.profile.email}
      </h1>
      <Card>
        <h2 className="mb-1 font-semibold">
          {staff.isOwner ? "בעלים — גישה מלאה" : "ההרשאות שלך"}
        </h2>
        {staff.isOwner && (
          <p className="mb-4 text-sm text-muted">
            כולל פעולות שרק הבעלים יכול לבצע: מחיקה לצמיתות, ניהול מנהלים והרשאות,
            וצפייה בהכנסות.
          </p>
        )}
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {mine.map((p) => (
            <li key={p.key}>✓ {p.label}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
