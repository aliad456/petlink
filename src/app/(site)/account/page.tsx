import { ExternalLink, Pencil, ShieldCheck, Store } from "lucide-react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/page-transition";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, Badge, buttonClass, Card, FormMessage, SectionTitle } from "@/components/ui";
import { getStaffContext, requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/business/media";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { Messages, type Message } from "./messages";
import { MarketingToggle } from "./marketing-toggle";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "החשבון שלי" };

const BUSINESS_STATUS = {
  draft: { label: "טיוטה", tone: "neutral" },
  pending: { label: "ממתין לאישור", tone: "warning" },
  approved: { label: "באוויר", tone: "success" },
  suspended: { label: "מושהה", tone: "danger" },
  removed: { label: "הוסר", tone: "danger" },
} as const;

const ACCOUNT_TYPE_LABEL = {
  pet_owner: "בעל/ת חיית מחמד",
  business_owner: "בעל/ת עסק",
} as const;

export default async function AccountPage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const [staff, business, { data: messages }, { data: consent }] = await Promise.all([
    getStaffContext(),
    profile.account_type === "business_owner" ? getOwnBusiness() : null,
    supabase
      .from("user_messages")
      .select("id, subject, body, created_at, read_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Message[]>(),
    supabase.from("profiles").select("marketing_consent").eq("id", profile.id).single<{ marketing_consent: boolean }>(),
  ]);

  return (
    <>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-8">
          <section className="animate-rise flex items-center gap-4">
            <Avatar name={profile.full_name || profile.email || "?"} seed={profile.id} className="size-16 text-xl" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">
                {profile.full_name || "החשבון שלי"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span dir="ltr">{profile.email}</span>
                <Badge tone="brand">{ACCOUNT_TYPE_LABEL[profile.account_type]}</Badge>
              </div>
            </div>
            <SignOutButton compact />
          </section>

          {profile.status !== "active" && (
            <FormMessage
              error={`החשבון ${profile.status === "locked" ? "נעול" : "חסום"}. לפרטים פנו לשירות הלקוחות.`}
            />
          )}

          {profile.account_type === "business_owner" &&
            (business ? (
              <Card className="animate-rise flex items-center gap-4" style={{ "--i": 1 } as CSSProperties}>
                <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-kami">
                  {business.avatar_path && (
                    // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
                    <img src={mediaUrl(business.avatar_path)!} alt="" className="size-full object-cover" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <SectionTitle>העסק שלי</SectionTitle>
                  <span className="truncate text-lg font-bold">{business.name}</span>
                  <Badge tone={BUSINESS_STATUS[business.status].tone} className="self-start" dot>
                    {BUSINESS_STATUS[business.status].label}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/business/edit" transitionTypes={["nav-forward"]} className={buttonClass({ size: "sm" })}>
                    <Pencil className="size-4" />
                    עריכה
                  </Link>
                  <Link href={`/b/${business.public_id}`} className={buttonClass({ variant: "glass", size: "sm" })}>
                    <ExternalLink className="size-4" />
                    צפייה
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="animate-rise flex flex-col items-center gap-3 p-7 text-center" style={{ "--i": 1 } as CSSProperties}>
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-kami text-white">
                  <Store className="size-6" />
                </span>
                <p className="text-lg font-bold">עוד לא פתחתם עמוד לעסק</p>
                <p className="max-w-sm text-sm text-muted">עמוד מעוצב עם תמונות, שעות, מחירון וכפתורי התקשרות — בכמה דקות.</p>
                <Link href="/business/new" transitionTypes={["nav-forward"]} className={buttonClass({ size: "lg" })}>
                  פתיחת עמוד עסק
                </Link>
              </Card>
            ))}

          <Card className="animate-rise flex flex-col gap-5" style={{ "--i": 2 } as CSSProperties}>
            <SectionTitle>פרטים אישיים</SectionTitle>
            <ProfileForm profile={profile} />
          </Card>

          <Card className="animate-rise flex flex-col gap-5" style={{ "--i": 3 } as CSSProperties}>
            <SectionTitle>התראות ופרטיות</SectionTitle>
            <MarketingToggle consent={consent?.marketing_consent ?? false} />
            <p className="text-sm text-muted">
              רוצים לקבל עותק של המידע שלכם או למחוק את החשבון?{" "}
              <Link href="/contact?kind=privacy" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
                שלחו בקשה
              </Link>
              .
            </p>
          </Card>

          {messages && messages.length > 0 && <Messages messages={messages} />}

          {staff && (
            <Link
              href="/admin"
              transitionTypes={["nav-forward"]}
              className={buttonClass({ variant: "glass", size: "lg", className: "self-center" })}
            >
              <ShieldCheck className="size-5 text-brand" />
              לפאנל הניהול
            </Link>
          )}
        </main>
      </PageTransition>
    </>
  );
}
