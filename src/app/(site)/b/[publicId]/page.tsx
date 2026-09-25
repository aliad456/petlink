import { BadgeCheck, Eye, Info, Pencil } from "lucide-react";
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
  const description =
    view.tagline || view.bio?.slice(0, 160) || `${view.category.name}${view.city ? ` ב${view.city}` : ""}`;
  // The share picture comes from ./opengraph-image.tsx.
  return {
    title: view.name,
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
  const [{ data: reviewRows }, { data: mine }, favorites, { data: adopted }, { data: myPets }] = await Promise.all([
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
  ]);
  // user_id stays on the server; the browser only learns which review is "mine".
  const toPublic = ({ user_id, ...r }: Review): PublicReview => ({ ...r, mine: user_id === profile?.id });
  const reviews = (reviewRows ?? []).map(toPublic);

  return (
    <>
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
              <div className="glass-lite flex flex-col gap-3 rounded-2xl p-4 text-sm sm:flex-row sm:items-center">
                <p className="flex flex-1 items-start gap-2.5 leading-relaxed text-muted">
                  <Info className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>
                    <strong className="font-semibold text-foreground">עמוד לא מנוהל.</strong> העמוד נוצר ע״י צוות {SITE_NAME}{" "}
                    מתוך מידע ציבורי, ואינו מנוהל ע״י בעל העסק. ייתכן שחלק מהפרטים אינם מעודכנים.
                  </span>
                </p>
                <Link
                  href={`/claim/${row.public_id}`}
                  transitionTypes={["nav-forward"]}
                  className={buttonClass({ size: "sm", className: "shrink-0" })}
                >
                  <BadgeCheck className="size-4" />
                  זה העסק שלך?
                </Link>
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
              canSharePet ? (
                <SharePetsButton
                  businessId={row.id}
                  businessName={row.name}
                  pets={(myPets ?? []).map(({ shares, ...p }) => ({ ...p, shared: shares.some((s) => s.business_id === row.id) }))}
                />
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
                viewer={!profile ? { kind: "anon" } : isOwner ? { kind: "owner" } : { kind: "user" }}
              />
            }
          />
        </main>
      </PageTransition>
    </>
  );
}
