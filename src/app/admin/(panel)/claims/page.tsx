import { BadgeCheck, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, Card } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FilterTabs } from "../users/filter-tabs";
import { ClaimActions } from "./claim-actions";

export const metadata: Metadata = { title: "בקשות בעלות" };

type Status = "pending" | "approved" | "rejected";

type Row = {
  id: string;
  kind: "claim" | "removal";
  full_name: string;
  role: string;
  phone: string;
  message: string | null;
  status: Status;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  business: { public_id: number; name: string; city: string | null; phone: string | null; website: string | null } | null;
  user: { full_name: string; email: string | null; account_type: string } | null;
};

const TABS: { value: Status; label: string }[] = [
  { value: "pending", label: "ממתינות" },
  { value: "approved", label: "אושרו" },
  { value: "rejected", label: "נדחו" },
];

export default async function ClaimsPage({ searchParams }: PageProps<"/admin/claims">) {
  await requirePermission("businesses.approve");
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.value === raw)?.value ?? "pending";

  const supabase = await createClient();
  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from("business_claims")
      .select(
        "id, kind, full_name, role, phone, message, status, review_note, created_at, reviewed_at, business:businesses(public_id, name, city, phone, website), user:profiles!business_claims_user_id_fkey(full_name, email, account_type)",
      )
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100)
      .returns<Row[]>(),
    supabase.from("business_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">בקשות בעלות</h1>
          <p className="mt-1 text-muted">
            בעלי עסקים שמבקשים לנהל או להסיר עמוד שנוצר ע״י הצוות. לפני אישור — התקשרו למספר הטלפון המפורסם של העסק (לא
            למספר שהמבקש מסר) וודאו שהוא אכן מורשה.
          </p>
        </header>

        <FilterTabs
          param="status"
          current={status === "pending" ? null : status}
          searchParams={{ status }}
          tabs={TABS.map((t) => ({
            value: t.value === "pending" ? null : t.value,
            label: t.value === "pending" ? `${t.label} (${count ?? 0})` : t.label,
          }))}
        />

        {!rows?.length ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <BadgeCheck className="size-10 text-muted" />
            <p className="font-semibold">אין בקשות כאן כרגע</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((c, i) => (
              <li key={c.id} className="glass-lite animate-rise flex flex-col gap-4 rounded-[1.75rem] p-5" style={{ "--i": i } as CSSProperties}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={c.kind === "claim" ? "brand" : "danger"}>{c.kind === "claim" ? "בקשת בעלות" : "בקשת הסרה"}</Badge>
                  {c.business && (
                    <Link href={`/b/${c.business.public_id}`} target="_blank" className="font-bold hover:underline">
                      {c.business.name}
                    </Link>
                  )}
                  <span className="text-sm text-muted">
                    {c.business?.city} · {formatRelative(c.created_at)}
                  </span>
                </div>

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <dl className="flex flex-col gap-1.5">
                    <dt className="text-xs font-semibold text-muted">המבקש</dt>
                    <dd className="font-medium">
                      {c.full_name} · {c.role}
                    </dd>
                    <dd dir="ltr" className="text-end">
                      {c.phone}
                    </dd>
                    <dd className="text-muted">
                      חשבון: {c.user?.full_name} ({c.user?.email}){c.user?.account_type === "business_owner" ? " · בעל עסק" : ""}
                    </dd>
                    {c.message && <dd className="whitespace-pre-line rounded-xl bg-[var(--glass-bg)] p-3">{c.message}</dd>}
                  </dl>
                  <dl className="flex flex-col gap-1.5">
                    <dt className="text-xs font-semibold text-muted">לאימות — הטלפון המפורסם של העסק</dt>
                    {c.business?.phone ? (
                      <dd>
                        <a href={`tel:${c.business.phone}`} dir="ltr" className="inline-flex items-center gap-1.5 font-semibold text-brand-strong dark:text-brand">
                          <Phone className="size-4" />
                          {c.business.phone}
                        </a>
                      </dd>
                    ) : (
                      <dd className="text-muted">אין טלפון בעמוד — בקשו מסמך (תעודת עוסק / רישיון)</dd>
                    )}
                    {c.business?.website && (
                      <dd dir="ltr" className="truncate text-end text-muted">
                        {c.business.website}
                      </dd>
                    )}
                  </dl>
                </div>

                {c.status === "pending" ? (
                  <ClaimActions id={c.id} kind={c.kind} name={c.business?.name ?? ""} />
                ) : (
                  c.review_note && <p className="text-sm text-muted">הערה: {c.review_note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
