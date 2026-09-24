import { Check, Crown } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, Card, SectionTitle } from "@/components/ui";
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
    <PageTransition>
      <div className="flex max-w-3xl flex-col gap-6">
        <header className="animate-rise flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">
            שלום {staff.profile.full_name || staff.profile.email}
          </h1>
          {staff.isOwner && (
            <Badge tone="brand" className="self-start">
              <Crown className="size-3.5" />
              בעלים — גישה מלאה
            </Badge>
          )}
        </header>
        <Card className="animate-rise flex flex-col gap-4" style={{ "--i": 1 } as CSSProperties}>
          <SectionTitle>{staff.isOwner ? "כל ההרשאות" : "ההרשאות שלך"}</SectionTitle>
          {staff.isOwner && (
            <p className="text-sm text-muted">
              כולל פעולות שרק הבעלים יכול לבצע: מחיקה לצמיתות, ניהול מנהלים והרשאות,
              וצפייה בהכנסות.
            </p>
          )}
          <ul className="grid gap-x-6 gap-y-2.5 text-[15px] sm:grid-cols-2">
            {mine.map((p) => (
              <li key={p.key} className="flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-brand">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageTransition>
  );
}
