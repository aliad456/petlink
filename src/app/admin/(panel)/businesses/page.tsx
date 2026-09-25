import { Crown, Store } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, Card } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/business/media";
import type { FilterValueRow } from "@/lib/business/load";
import type { BusinessStatus, Hours } from "@/lib/business/types";
import { getBusinessFilters } from "@/lib/catalog";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FilterTabs } from "../users/filter-tabs";
import { BusinessActions } from "./business-actions";
import { ImportBusinessesButton } from "./import-dialog";
import { UnclaimedBusinessButton } from "./unclaimed-dialog";

export const metadata: Metadata = { title: "עסקים" };

type Row = {
  id: string;
  public_id: number;
  name: string;
  city: string | null;
  status: BusinessStatus;
  status_reason: string | null;
  is_featured: boolean;
  avatar_path: string | null;
  pro_waitlist_at: string | null;
  submitted_at: string | null;
  created_at: string;
  owner_id: string | null;
  category_id: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  bio: string | null;
  hours: Hours;
  open_on_holidays: boolean;
  values: FilterValueRow[];
  category: { name: string } | null;
  owner: { full_name: string; email: string | null } | null;
};

const TABS: { value: BusinessStatus; label: string }[] = [
  { value: "pending", label: "ממתינים לאישור" },
  { value: "approved", label: "באוויר" },
  { value: "draft", label: "טיוטות" },
  { value: "suspended", label: "מושהים" },
  { value: "removed", label: "הוסרו" },
];

export default async function BusinessesPage({ searchParams }: PageProps<"/admin/businesses">) {
  const staff = await requirePermission("businesses.view");
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.value === raw)?.value ?? "pending";

  const supabase = await createClient();
  const [{ data: rows }, { data: counts }, { data: categories }, filters] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id, public_id, name, city, status, status_reason, is_featured, avatar_path, pro_waitlist_at, submitted_at, created_at, owner_id, category_id, address, phone, whatsapp, website, bio, hours, open_on_holidays, values:business_filter_values(filter_id, bool_value, option_values), category:categories(name), owner:profiles!businesses_owner_id_fkey(full_name, email)",
      )
      .eq("status", status)
      .order(status === "pending" ? "submitted_at" : "created_at", { ascending: status === "pending" })
      .limit(100)
      .returns<Row[]>(),
    supabase.from("businesses").select("status").returns<{ status: BusinessStatus }[]>(),
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("sort_order")
      .returns<{ id: string; name: string; slug: string }[]>(),
    getBusinessFilters(),
  ]);

  const count = (s: BusinessStatus) => counts?.filter((c) => c.status === s).length ?? 0;
  const has = (p: Parameters<typeof staff.permissions.has>[0]) => staff.isOwner || staff.permissions.has(p);

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">עסקים</h1>
            <p className="mt-1 text-muted">אישור עסקים חדשים, השהיה, הסרה וסימון כמומלץ.</p>
          </div>
          {has("businesses.edit") && (
            <div className="flex flex-wrap gap-2">
              <ImportBusinessesButton categories={categories ?? []} filters={filters} />
              <UnclaimedBusinessButton categories={categories ?? []} filters={filters} />
            </div>
          )}
        </header>

        <FilterTabs
          param="status"
          current={status === "pending" ? null : status}
          searchParams={{ status }}
          tabs={TABS.map((t) => ({
            value: t.value === "pending" ? null : t.value,
            label: `${t.label} (${count(t.value)})`,
          }))}
        />

        {!rows?.length ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <Store className="size-10 text-muted" />
            <p className="font-semibold">אין עסקים כאן כרגע</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((b, i) => (
              <li key={b.id} className="glass-lite animate-rise flex flex-col gap-4 rounded-[1.75rem] p-4 sm:flex-row sm:items-center" style={{ "--i": i } as CSSProperties}>
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-kami">
                    {b.avatar_path && (
                      // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
                      <img src={mediaUrl(b.avatar_path)!} alt="" className="size-full object-cover" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-bold">{b.name}</span>
                      {b.is_featured && <Badge tone="warning">★ מומלץ</Badge>}
                      {!b.owner_id && <Badge>לא מנוהל</Badge>}
                      {b.pro_waitlist_at && (
                        <Badge tone="brand">
                          <Crown className="size-3" />
                          מתעניין ב-PRO
                        </Badge>
                      )}
                    </div>
                    <span className="truncate text-sm text-muted">
                      {[b.category?.name, b.city].filter(Boolean).join(" · ")}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {b.owner ? b.owner.full_name || b.owner.email : "נוצר ע״י הצוות"}
                      {" · "}
                      {b.status === "pending" && b.submitted_at
                        ? `נשלח ${formatRelative(b.submitted_at)}`
                        : `נוצר ${formatRelative(b.created_at)}`}
                    </span>
                    {b.status_reason && <span className="text-xs text-danger">{b.status_reason}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                {!b.owner_id && has("businesses.edit") && b.status !== "removed" && (
                  <UnclaimedBusinessButton
                    categories={categories ?? []}
                    filters={filters}
                    initial={{
                      id: b.id,
                      name: b.name,
                      category_id: b.category_id,
                      city: b.city,
                      address: b.address,
                      phone: b.phone,
                      whatsapp: b.whatsapp,
                      website: b.website,
                      bio: b.bio,
                      hours: b.hours,
                      open_on_holidays: b.open_on_holidays,
                      values: b.values,
                    }}
                  />
                )}
                <BusinessActions
                  business={{ id: b.id, publicId: b.public_id, name: b.name, status: b.status, featured: b.is_featured }}
                  can={{ approve: has("businesses.approve"), remove: has("businesses.remove"), feature: has("businesses.feature") }}
                />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
