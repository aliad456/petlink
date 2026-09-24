import {
  ArrowRight,
  CalendarDays,
  Crown,
  LogIn,
  Mail,
  MailCheck,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition, type CSSProperties, type ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { Avatar, Badge, buttonClass, Card, FormMessage, SectionTitle } from "@/components/ui";
import {
  ACCOUNT_TYPE_LABEL,
  ACTION_LABEL,
  displayName,
  getUser,
  getUserHistory,
  STATUS_META,
} from "@/lib/admin/users";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { isUuid } from "@/lib/uuid";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "כרטיס משתמש" };

// 050-1234567 → 972501234567 for wa.me links.
function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

export default async function UserPage({ params }: PageProps<"/admin/users/[id]">) {
  const staff = await requirePermission("users.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user, history] = await Promise.all([getUser(id), getUserHistory(id)]);
  if (!user) notFound();

  const name = displayName(user);
  const meta = STATUS_META[user.deleted_at ? "deleted" : user.status];
  const has = (p: Parameters<typeof staff.permissions.has>[0]) =>
    staff.isOwner || staff.permissions.has(p);

  return (
    <PageTransition>
      <div className="flex max-w-3xl flex-col gap-5">
        <Link
          href="/admin/users"
          transitionTypes={["nav-back"]}
          className={buttonClass({ variant: "ghost", size: "sm", className: "self-start" })}
        >
          <ArrowRight className="size-4" />
          כל המשתמשים
        </Link>

        {/* כותרת */}
        <Card className="flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:text-start">
          <ViewTransition name={`avatar-${user.id}`} share="morph" default="none">
            <Avatar name={name} seed={user.id} className="size-20 text-2xl" />
          </ViewTransition>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {name}
              {user.is_owner && <Crown className="size-5 text-amber-500" aria-label="בעלים" />}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone={meta.tone} dot>
                {meta.label}
              </Badge>
              <Badge tone="neutral">{ACCOUNT_TYPE_LABEL[user.account_type]}</Badge>
              {user.is_staff && (
                <Badge tone="brand">
                  <ShieldCheck className="size-3.5" />
                  {user.is_owner ? "בעלים" : user.staff_role ?? "צוות"}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {(user.status !== "active" || user.deleted_at) && (
          <FormMessage
            error={[
              user.deleted_at && `נמחק ב-${formatDateTime(user.deleted_at)}.`,
              user.status !== "active" &&
                `${STATUS_META[user.status].label}${user.status_reason ? `: ${user.status_reason}` : ""}`,
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {/* פרטים */}
        <Card className="animate-rise flex flex-col gap-1" style={{ "--i": 1 } as CSSProperties}>
          <SectionTitle className="mb-2">פרטים</SectionTitle>
          <InfoRow icon={Mail} label="מייל">
            {user.email ? (
              <a href={`mailto:${user.email}`} dir="ltr" className="hover:text-brand">
                {user.email}
              </a>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={Phone} label="טלפון">
            {user.phone ? (
              <span className="flex items-center gap-3">
                <a href={`tel:${user.phone}`} dir="ltr" className="hover:text-brand">
                  {user.phone}
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber(user.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="וואטסאפ"
                  className="pressable inline-flex size-8 items-center justify-center rounded-full bg-[color-mix(in_oklab,#25d366_18%,transparent)] text-[#128c7e] dark:text-[#25d366]"
                >
                  <MessageCircle className="size-4" />
                </a>
              </span>
            ) : (
              "—"
            )}
          </InfoRow>
          <InfoRow icon={CalendarDays} label="הצטרף">
            {formatDate(user.created_at)}
          </InfoRow>
          <InfoRow icon={LogIn} label="כניסה אחרונה">
            {user.last_sign_in_at ? (
              <span title={formatDateTime(user.last_sign_in_at)}>
                {formatRelative(user.last_sign_in_at)}
              </span>
            ) : (
              "לא נכנס עדיין"
            )}
          </InfoRow>
          <InfoRow icon={MailCheck} label="אימות מייל">
            {user.email_confirmed_at ? (
              <Badge tone="success">מאומת</Badge>
            ) : (
              <Badge tone="warning">לא אומת</Badge>
            )}
          </InfoRow>
        </Card>

        {/* עסק */}
        {user.account_type === "business_owner" && (
          <Card className="animate-rise flex flex-col gap-1" style={{ "--i": 2 } as CSSProperties}>
            <SectionTitle className="mb-2">עסק</SectionTitle>
            <InfoRow icon={Store} label="עמוד העסק">
              <span className="text-muted">טרם נוצר</span>
            </InfoRow>
            <InfoRow icon={Crown} label="מנוי PRO">
              <Badge tone="neutral">אין מנוי</Badge>
            </InfoRow>
          </Card>
        )}

        {/* פעולות */}
        <Card className="animate-rise flex flex-col gap-4" style={{ "--i": 3 } as CSSProperties}>
          <SectionTitle>פעולות</SectionTitle>
          <UserActions
            user={{
              id: user.id,
              name,
              email: user.email,
              status: user.status,
              deleted: Boolean(user.deleted_at),
              manageable: user.can_manage,
            }}
            can={{
              lock: has("users.lock"),
              block: has("users.block"),
              reset: has("users.reset_password"),
              message: has("users.message"),
              delete: has("users.delete"),
              owner: staff.isOwner,
            }}
          />
        </Card>

        {/* היסטוריה */}
        {has("audit.view") && (
          <Card className="animate-rise flex flex-col gap-4" style={{ "--i": 4 } as CSSProperties}>
            <SectionTitle>היסטוריית פעולות</SectionTitle>
            {history.length === 0 ? (
              <p className="text-sm text-muted">עדיין לא בוצעו פעולות על המשתמש.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 ps-5 before:absolute before:inset-y-1 before:start-[5px] before:w-px before:bg-border">
                {history.map((h) => {
                  const reason = typeof h.details.reason === "string" ? h.details.reason : null;
                  const subject = typeof h.details.subject === "string" ? h.details.subject : null;
                  return (
                    <li key={h.id} className="relative flex flex-col gap-0.5">
                      <span className="absolute -start-5 top-1.5 size-[11px] rounded-full border-2 border-[var(--background)] bg-brand" />
                      <span className="font-semibold">{ACTION_LABEL[h.action] ?? h.action}</span>
                      {(reason || subject) && (
                        <span className="text-sm text-foreground/80">{reason ?? subject}</span>
                      )}
                      <span className="text-xs text-muted">
                        {h.actor?.full_name || h.actor?.email || "מערכת"} ·{" "}
                        <time dateTime={h.created_at} title={formatDateTime(h.created_at)}>
                          {formatRelative(h.created_at)}
                        </time>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        )}
      </div>
    </PageTransition>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-border py-2 last:border-b-0">
      <Icon className="size-[18px] shrink-0 text-muted" />
      <span className="w-28 shrink-0 text-sm text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{children}</span>
    </div>
  );
}
