import { MaintenanceGate } from "@/components/maintenance";
import { BadgeCheck, CalendarClock, ChevronLeft, Eye, Info, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BusinessPage } from "@/components/business/business-page";
import { PageTransition } from "@/components/page-transition";
import { SharePetsButton } from "@/components/pets/share-pets-button";
import { ReviewsPanel, type PublicReview } from "@/components/reviews/reviews-panel";
import { buttonClass } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/session";
import { getFavoriteIds } from "@/lib/favorites";
import type { Species } from "@/lib/pets";
import { businessJsonLd } from "@/lib/business/json-ld";
import { BUSINESS_COLUMNS, toView, type BusinessRow } from "@/lib/business/load";
import { getBusinessFilters } from "@/lib/catalog";
import { REVIEW_COLUMNS, type Review } from "@/lib/reviews/types";
import { SITE_NAME } from "@/lib/site";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// RLS decides who sees what: everyone sees approved businesses; the owner and
// staff with businesses.view also see drafts/pending/suspended ones.
const load = cache(async (publicId: string) => {
  const id = Number(publicId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const supabase = await createClient();
  const [{ data }, filters] = await Promise.all([
    supabase.from("businesses").select(BUSINESS_COLUMNS).eq("public_id", id).maybeSingle<BusinessRow>(),
    getBusinessFilters(),
  ]);
  return data ? { row: data, view: toView(data, filters) } : null;
});

export async function generateMetadata({ params }: PageProps<"/b/[publicId]">): Promise<Metadata> {
  const result = await load((await params).publicId);
  if (!result) return { title: "העסק לא נמצא" };
  const { view } = result;
  const where = `${view.category.name}${view.city ? ` ב${view.city}` : ""}`;
  const intro = (view.tagline || view.bio || "").replace(/\s+/g, " ").trim();
  const description = `${intro ? `${intro.slice(0, 110)}${intro.length > 110 ? "…" : ""} · ` : ""}${where}. טלפון, שעות פעילות וביקורות ב-Kami.`;
  // "שם העסק · וטרינרים בבאר שבע | Kami", so the result says what and where.
  const title = `${view.name} · ${where}`;
  // The share picture comes from ./opengraph-image.tsx.
  return {
    title,
    description,
    alternates: { canonical: `/b/${view.public_id}` },
    openGraph: { title: view.name, description, locale: "he_IL", type: "website", siteName: SITE_NAME },
    robots: view.status === "approved" ? undefined : { index: false },
  };
}

const STATUS_NOTE: Record<string, string> = {
  draft: "טיוטה — העמוד עדיין לא מוצג לציבור.",
  pending: "ממתין לאישור — העמוד יוצג לציבור אחרי שהצוות יאשר אותו.",
  suspended: "העמוד הושהה ואינו מוצג לציבור.",
  removed: "העמוד הוסר ואינו מוצג לציבור.",
};

export default async function PublicBusinessPage({ params }: PageProps<"/b/[publicId]">) {
  const result = await load((await params).publicId);
  if (!result) notFound();
  const { row, view } = result;
  const profile = await getCurrentProfile();
  const isOwner = profile?.id === row.owner_id;

  const supabase = await createClient();
  const canSharePet = profile?.account_type === "pet_owner" && row.owner_id !== null && row.status === "approved";
  const bookingCheck = row.plan === "pro" && row.status === "approved" && !isOwner;
  const [{ data: reviewRows }, { data: mine }, favorites, { data: adopted }, { data: myPets }, { data: bookingOn }, { count: bookable }, { data: blocks }] = await Promise.all([
    supabase
      .from("reviews")
      .select(REVIEW_COLUMNS)
      .eq("business_id", row.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Review[]>(),
    profile
      ? supabase
          .from("reviews")
          .select(REVIEW_COLUMNS)
          .eq("business_id", row.id)
          .eq("user_id", profile.id)
          .maybeSingle<Review>()
      : Promise.resolve({ data: null }),
    getFavoriteIds(),
    supabase.rpc("adopted_count", { p_business: row.id }),
    canSharePet
      ? supabase
          .from("pets")
          .select("id, name, species, avatar_path, shares:pet_shares(business_id)")
          .eq("owner_id", profile!.id)
          .order("created_at")
          .returns<{ id: string; name: string; species: Species; avatar_path: string | null; shares: { business_id: string }[] }[]>()
      : Promise.resolve({ data: null }),
    bookingCheck
      ? supabase.from("booking_settings").select("enabled").eq("business_id", row.id).eq("enabled", true).maybeSingle()
      : Promise.resolve({ data: null }),
    bookingCheck
      ? supabase.from("booking_services").select("id", { count: "exact", head: true }).eq("business_id", row.id).eq("active", true)
      : Promise.resolve({ count: 0 }),
    profile
      ? supabase.from("user_blocks").select("blocked_id").returns<{ blocked_id: string }[]>()
      : Promise.resolve({ data: null }),
  ]);
  const canBook = !!bookingOn && (bookable ?? 0) > 0;
  // user_id stays on the server; the browser only learns which review is "mine".
  const toPublic = ({ user_id, ...r }: Review): PublicReview => ({ ...r, mine: user_id === profile?.id });
  // Authors this user blocked are hidden from them (App Store 1.2).
  const blocked = new Set((blocks ?? []).map((b) => b.blocked_id));
  const reviews = (reviewRows ?? []).filter((r) => !blocked.has(r.user_id)).map(toPublic);

  return (
    <MaintenanceGate path="/b/*">
      <PageTransition>
        <main className="flex flex-1 flex-col pb-16">
          {(row.status !== "approved" || isOwner) && (
            <div className="mx-auto mt-3 flex w-full max-w-3xl flex-wrap items-center gap-3 px-4">
              {row.status !== "approved" && (
                <p className="glass flex flex-1 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium">
                  <Eye className="size-4 shrink-0 text-warning" />
                  {STATUS_NOTE[row.status]}
                </p>
              )}
              {isOwner && (
                <Link
                  href="/business/edit"
                  transitionTypes={["nav-forward"]}
                  className={buttonClass({ variant: "glass", size: "sm" })}
                >
                  <Pencil className="size-4" />
                  עריכת העמוד
                </Link>
              )}
            </div>
          )}
          {row.owner_id === null && row.status === "approved" && (
            <div className="mx-auto mt-3 w-full max-w-3xl px-4">
              <div className="glass-lite flex flex-col gap-3 rounded-2xl p-4 text-sm">
                <p className="flex items-start gap-2.5 leading-relaxed text-muted">
                  <Info className="mt-0.5 size-4 shrink-0 text-warning" />
                  <span>
                    <strong className="font-semibold text-foreground">עסק שלא אומת.</strong> הפרטים בעמוד נאספו באופן
                    כללי ממקורות פומביים באינטרנט, ולא נבדקו מול בעל העסק או אושרו על ידו. ייתכן שחלקם אינם מדויקים או
                    מעודכנים — מומלץ לוודא מול העסק לפני הגעה. {SITE_NAME} אינו קשור לעסק ואינו אחראי לפרטים.
                  </span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={profile ? `/claim/${row.public_id}` : `/signup?type=business&next=${encodeURIComponent(`/claim/${row.public_id}`)}`}
                    transitionTypes={["nav-forward"]}
                    className={buttonClass({ size: "sm", className: "shrink-0" })}
                  >
                    <BadgeCheck className="size-4" />
                    העסק שלך? {profile ? "קבל גישה מלאה" : "צור משתמש וקבל גישה מלאה"}
                  </Link>
                  <Link
                    href={
                      profile
                        ? `/claim/${row.public_id}?kind=removal`
                        : `/contact?kind=business&topic=removal&page=${encodeURIComponent(`/b/${row.public_id}`)}`
                    }
                    className="px-2 py-1 text-muted underline underline-offset-2 hover:text-foreground"
                  >
                    העסק בבעלותך ורוצה להסיר אותו? לחץ כאן
                  </Link>
                </div>
              </div>
            </div>
          )}
          {row.status === "approved" && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: businessJsonLd(view, `${siteUrl()}/b/${row.public_id}`) }}
            />
          )}
          <BusinessPage
            business={{ ...view, adopted_count: (adopted as number | null) ?? 0 }}
            actions={
              canBook || canSharePet ? (
                <>
                  {canBook && (
                    <Link
                      href={`/b/${row.public_id}/book`}
                      transitionTypes={["nav-forward"]}
                      prefetch
                      className="pressable focus-ring mt-3 flex w-full items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-4 py-3.5 text-start text-white shadow-lg"
                    >
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                        <CalendarClock className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">קביעת תור אונליין</span>
                        <span className="block text-sm text-white/85">בוחרים שירות, יום ושעה. התור נקבע מיד.</span>
                      </span>
                      <ChevronLeft className="size-5 shrink-0" />
                    </Link>
                  )}
                  {canSharePet && (
                    <SharePetsButton
                      businessId={row.id}
                      businessName={row.name}
                      pets={(myPets ?? []).map(({ shares, ...p }) => ({ ...p, shared: shares.some((s) => s.business_id === row.id) }))}
                    />
                  )}
                </>
              ) : undefined
            }
            saved={favorites ? favorites.includes(row.id) : null}
            reviews={
              <ReviewsPanel
                businessId={row.id}
                publicId={row.public_id}
                businessName={row.name}
                unclaimed={row.owner_id === null}
                reviews={reviews}
                myReview={mine ? toPublic(mine) : null}
                viewer={
                  !profile
                    ? { kind: "anon" }
                    : isOwner
                      ? { kind: "owner" }
                      : { kind: "user", verified: !!profile.email_verified_at, email: profile.email }
                }
              />
            }
          />
        </main>
      </PageTransition>
    </MaintenanceGate>
  );
}
