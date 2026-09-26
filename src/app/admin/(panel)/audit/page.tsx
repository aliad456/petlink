import {
  BadgeCheck,
  History,
  Inbox,
  Megaphone,
  Star,
  Store,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, Card } from "@/components/ui";
import {
  AUDIT_GROUPS,
  auditGroup,
  auditLabel,
  auditSummary,
  GROUP_PREFIXES,
  type AuditGroup,
} from "@/lib/audit";
import { requirePermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { FilterTabs } from "../users/filter-tabs";

export const metadata: Metadata = { title: "יומן פעולות" };

const PAGE = 50;

const GROUP_ICON: Record<AuditGroup, LucideIcon> = {
  business: Store,
  user: Users,
  review: Star,
  ads: Megaphone,
  catalog: Tags,
  contact: Inbox,
};

type Row = {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor: { full_name: string; email: string | null } | null;
};

const exact = new Intl.DateTimeFormat("he-IL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Jerusalem",
});

// The admin activity log: every staff action, newest first. Read-only (the table
// is append-only and only written through public.log_admin_action).
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requirePermission("audit.view");
  const sp = await searchParams;
  const group = AUDIT_GROUPS.find((g) => g.key === sp.g)?.key ?? null;
  const before = Number(sp.before) || null;

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, details, created_at, actor:profiles!audit_log_actor_id_fkey(full_name, email)")
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (group) query = query.or(GROUP_PREFIXES[group].map((p) => `action.like.${p}%`).join(","));
  if (before) query = query.lt("id", before);
  const { data } = await query.returns<Row[]>();
  const rows = (data ?? []).slice(0, PAGE);
  const more = (data?.length ?? 0) > PAGE;

  // Names for the targets, in two small lookups.
  const ids = (type: string) =>
    [...new Set(rows.filter((r) => r.target_type === type && r.target_id && isUuid(r.target_id)).map((r) => r.target_id!))];
  const [bizIds, userIds] = [ids("business"), ids("user")];
  const [{ data: businesses }, { data: users }] = await Promise.all([
    bizIds.length
      ? supabase.from("businesses").select("id, name, public_id").in("id", bizIds).returns<{ id: string; name: string; public_id: number }[]>()
      : Promise.resolve({ data: [] as { id: string; name: string; public_id: number }[] }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", userIds).returns<{ id: string; full_name: string; email: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null }[] }),
  ]);
  const bizById = new Map((businesses ?? []).map((b) => [b.id, b]));
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const target = (r: Row) => {
    if (r.target_type === "business" && r.target_id) {
      const b = bizById.get(r.target_id);
      return b ? { label: b.name, href: `/b/${b.public_id}` } : null;
    }
    if (r.target_type === "user" && r.target_id) {
      const u = userById.get(r.target_id);
      return { label: u?.full_name || u?.email || "משתמש", href: `/admin/users/${r.target_id}` };
    }
    return null;
  };

  const nextHref = () => {
    const q = new URLSearchParams();
    if (group) q.set("g", group);
    q.set("before", String(rows[rows.length - 1]?.id ?? ""));
    return `?${q.toString()}`;
  };

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">יומן פעולות</h1>
          <p className="mt-1 text-muted">כל פעולה שנעשתה בפאנל: מי, מה ומתי. היומן לקריאה בלבד ואי אפשר למחוק ממנו.</p>
        </header>

        <FilterTabs
          param="g"
          current={group}
          searchParams={{}}
          tabs={[{ value: null, label: "הכול" }, ...AUDIT_GROUPS.map((g) => ({ value: g.key, label: g.label }))]}
        />

        {rows.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <History className="size-10 text-muted" />
            <p className="font-semibold">אין פעולות להצגה</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r, i) => {
              const g = auditGroup(r.action);
              const Icon = g ? GROUP_ICON[g] : BadgeCheck;
              const t = target(r);
              const summary = auditSummary(r.details ?? {});
              const actor = r.actor?.full_name || r.actor?.email || "מערכת";
              return (
                <li
                  key={r.id}
                  className="glass-lite animate-rise flex items-start gap-3 rounded-2xl p-3.5"
                  style={{ "--i": Math.min(i, 12) } as CSSProperties}
                >
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-[15px] leading-snug">
                      <span className="font-semibold">{actor}</span> {auditLabel(r.action)}
                      {t && (
                        <>
                          {": "}
                          <Link href={t.href} className="font-semibold text-brand-strong hover:underline dark:text-brand">
                            {t.label}
                          </Link>
                        </>
                      )}
                    </p>
                    {summary.length > 0 && <p className="truncate text-sm text-muted">{summary.join(" · ")}</p>}
                  </div>
                  <time
                    dateTime={r.created_at}
                    title={exact.format(new Date(r.created_at))}
                    className="shrink-0 text-xs text-muted"
                  >
                    {formatRelative(r.created_at)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}

        {(more || before) && (
          <div className="flex gap-2">
            {before && (
              <Link href={group ? `?g=${group}` : "?"} className={buttonClass({ variant: "ghost", size: "sm" })}>
                לחדשות ביותר
              </Link>
            )}
            {more && (
              <Link href={nextHref()} className={buttonClass({ variant: "glass", size: "sm" })}>
                פעולות קודמות
              </Link>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
