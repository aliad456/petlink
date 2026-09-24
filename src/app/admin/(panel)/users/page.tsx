import { ChevronLeft, Crown, SearchX, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ViewTransition, type CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Avatar, Badge, buttonClass, Card } from "@/components/ui";
import {
  ACCOUNT_TYPE_LABEL,
  displayName,
  listUsers,
  PAGE_SIZE,
  STATUS_FILTERS,
  STATUS_META,
  TYPE_FILTERS,
  type StatusFilter,
  type TypeFilter,
} from "@/lib/admin/users";
import { requirePermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { FilterTabs } from "./filter-tabs";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "משתמשים" };

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requirePermission("users.view");
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q : undefined;
  const status = pick<StatusFilter>(sp.status, STATUS_FILTERS);
  const type = pick<TypeFilter>(sp.type, TYPE_FILTERS);
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listUsers({ query, status, type, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = { q: query, status, type };

  const pageHref = (p: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (status) next.set("status", status);
    if (type) next.set("type", type);
    if (p > 1) next.set("page", String(p));
    return `?${next}`;
  };

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">משתמשים</h1>
            <p className="mt-1 text-muted">
              {total.toLocaleString("he-IL")} {query ? "תוצאות" : "משתמשים"}
            </p>
          </div>
        </header>

        <SearchBox />

        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            param="status"
            current={status ?? null}
            searchParams={current}
            tabs={[
              { value: null, label: "הכול" },
              { value: "active", label: "פעילים" },
              { value: "locked", label: "נעולים" },
              { value: "blocked", label: "חסומים" },
              { value: "deleted", label: "נמחקו" },
            ]}
          />
          <FilterTabs
            param="type"
            size="sm"
            current={type ?? null}
            searchParams={current}
            tabs={[
              { value: null, label: "כל הסוגים" },
              { value: "pet_owner", label: "בעלי חיות" },
              { value: "business_owner", label: "עסקים" },
              { value: "staff", label: "צוות" },
            ]}
          />
        </div>

        {rows.length === 0 ? (
          <Card className="animate-rise flex flex-col items-center gap-3 py-14 text-center">
            <SearchX className="size-10 text-muted" />
            <p className="font-semibold">לא נמצאו משתמשים</p>
            <p className="text-sm text-muted">נסו לחפש לפי חלק מהשם, מהמייל או מספר הטלפון.</p>
          </Card>
        ) : (
          <ul className="glass flex flex-col overflow-hidden rounded-[1.75rem] p-1.5">
            {rows.map((user, i) => {
              const statusKey = user.deleted_at ? "deleted" : user.status;
              const meta = STATUS_META[statusKey];
              return (
                <li
                  key={user.id}
                  className="animate-rise"
                  style={{ "--i": Math.min(i, 12) } as CSSProperties}
                >
                  <Link
                    href={`/admin/users/${user.id}`}
                    transitionTypes={["nav-forward"]}
                    className="focus-ring group flex items-center gap-3.5 rounded-[1.35rem] px-3 py-3 transition-colors duration-200 hover:bg-[var(--glass-bg-strong)]"
                  >
                    <ViewTransition name={`avatar-${user.id}`} share="morph" default="none">
                      <Avatar name={displayName(user)} seed={user.id} />
                    </ViewTransition>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{displayName(user)}</span>
                        {user.is_owner ? (
                          <Crown className="size-4 shrink-0 text-amber-500" aria-label="בעלים" />
                        ) : user.is_staff ? (
                          <ShieldCheck className="size-4 shrink-0 text-brand" aria-label="צוות" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <span dir="ltr" className="truncate">
                          {user.email}
                        </span>
                        {user.phone && (
                          <>
                            <span aria-hidden>·</span>
                            <span dir="ltr" className="whitespace-nowrap">
                              {user.phone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="hidden flex-col items-end gap-1 text-xs text-muted sm:flex">
                      <span>{ACCOUNT_TYPE_LABEL[user.account_type]}</span>
                      <span>
                        {user.last_sign_in_at
                          ? `נכנס ${formatRelative(user.last_sign_in_at)}`
                          : "לא נכנס עדיין"}
                      </span>
                    </div>
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
                    <ChevronLeft className="size-5 shrink-0 text-muted transition-transform duration-300 ease-spring group-hover:-translate-x-1" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <nav className="flex items-center justify-center gap-3" aria-label="עמודים">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonClass({ variant: "glass", size: "sm" })}>
                הקודם
              </Link>
            ) : null}
            <span className="text-sm text-muted">
              עמוד {page} מתוך {pages}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className={buttonClass({ variant: "glass", size: "sm" })}>
                הבא
              </Link>
            ) : null}
          </nav>
        )}
      </div>
    </PageTransition>
  );
}
