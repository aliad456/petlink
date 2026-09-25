import { ExternalLink, Heart, PawPrint, Pencil, ShieldCheck, Store } from "lucide-react";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { PageTransition } from "@/components/page-transition";
import { SignOutButton } from "@/components/sign-out-button";
import { Avatar, Badge, buttonClass, Card, FormMessage, SectionTitle } from "@/components/ui";
import { getStaffContext, requireUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/business/media";
import { getOwnBusiness } from "@/lib/business/own";
import { petAge, petMediaUrl, SPECIES, type Pet } from "@/lib/pets";
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

type PetCard = Pick<Pet, "id" | "name" | "species" | "breed" | "sex" | "birth_date" | "birth_date_estimated" | "avatar_path">;

type SavedBusiness = {
  id: string;
  public_id: number;
  name: string;
  city: string | null;
  avatar_path: string | null;
  category: { name: string; icon: string | null } | null;
};

const ACCOUNT_TYPE_LABEL = {
  pet_owner: "בעל/ת חיית מחמד",
  business_owner: "בעל/ת עסק",
} as const;

export default async function AccountPage() {
  const profile = await requireUser();
  const supabase = await createClient();
  const [staff, business, { data: messages }, { data: consent }, { data: saved }, { data: pets }] = await Promise.all([
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
    supabase
      .from("favorites")
      .select("business:businesses(id, public_id, name, city, avatar_path, category:categories(name, icon))")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<{ business: SavedBusiness | null }[]>(),
    profile.account_type === "pet_owner"
      ? supabase
          .from("pets")
          .select("id, name, species, breed, sex, birth_date, birth_date_estimated, avatar_path")
          .eq("owner_id", profile.id)
          .order("created_at")
          .returns<PetCard[]>()
      : Promise.resolve({ data: null }),
  ]);
  const savedBusinesses = (saved ?? []).map((r) => r.business).filter((b): b is SavedBusiness => !!b);

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

          {profile.account_type === "pet_owner" && (
            <Card className="animate-rise flex flex-col gap-4" style={{ "--i": 1 } as CSSProperties}>
              <SectionTitle>חיות המחמד שלי</SectionTitle>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(pets ?? []).map((p) => {
                  const avatar = petMediaUrl(p.avatar_path);
                  const age = petAge(p);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/account/pets/${p.id}`}
                        transitionTypes={["nav-forward"]}
                        className="pressable focus-ring glass-glow flex h-full flex-col items-center gap-2 rounded-3xl bg-[var(--glass-bg)] p-4 text-center"
                      >
                        <span className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-[var(--glass-bg-strong)] text-4xl ring-2 ring-[color-mix(in_oklab,var(--brand)_45%,transparent)]">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- owner's photo
                            <img src={avatar} alt="" className="size-full object-cover" />
                          ) : (
                            SPECIES[p.species].emoji
                          )}
                        </span>
                        <span className="font-bold">{p.name}</span>
                        <span className="text-xs text-muted">{[p.breed || SPECIES[p.species].label, age].filter(Boolean).join(" · ")}</span>
                      </Link>
                    </li>
                  );
                })}
                {(pets?.length ?? 0) < 10 && (
                  <li>
                    <Link
                      href="/account/pets/new"
                      transitionTypes={["nav-forward"]}
                      className="pressable focus-ring flex h-full min-h-36 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[color-mix(in_oklab,var(--muted)_35%,transparent)] p-4 text-center text-sm font-semibold text-muted hover:text-foreground"
                    >
                      <PawPrint className="size-7" />
                      {pets?.length ? "הוספת חיה" : "הוסיפו את חיית המחמד שלכם"}
                    </Link>
                  </li>
                )}
              </ul>
            </Card>
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
                  <Link href="/business/pets" transitionTypes={["nav-forward"]} className={buttonClass({ variant: "glass", size: "sm" })}>
                    <PawPrint className="size-4" />
                    חיות ששותפו איתי
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

          <Card className="animate-rise flex flex-col gap-4" style={{ "--i": 2 } as CSSProperties}>
            <SectionTitle>העסקים ששמרתי</SectionTitle>
            {savedBusinesses.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Heart className="size-4" />
                לחצו על הלב בעמוד של עסק כדי לשמור אותו כאן.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {savedBusinesses.map((b) => {
                  const avatar = mediaUrl(b.avatar_path);
                  return (
                    <li key={b.id}>
                      <Link
                        href={`/b/${b.public_id}`}
                        transitionTypes={["nav-forward"]}
                        className="pressable focus-ring flex items-center gap-3 rounded-2xl p-2 hover:bg-[var(--glass-bg)]"
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-kami text-white">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- small thumbnail
                            <img src={avatar} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center">
                              <CategoryIcon name={b.category?.icon ?? null} className="size-5" />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{b.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {[b.category?.name, b.city].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <Heart className="size-4 shrink-0 fill-rose-500 text-rose-500" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

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
