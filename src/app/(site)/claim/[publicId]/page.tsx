import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { Card, FormMessage } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "בקשת בעלות על עמוד", robots: { index: false } };

type Row = { id: string; public_id: number; name: string; city: string | null; owner_id: string | null };

export default async function ClaimPage({ params, searchParams }: PageProps<"/claim/[publicId]">) {
  const [{ publicId }, sp] = await Promise.all([params, searchParams]);
  const wantsRemoval = sp.kind === "removal";
  const id = Number(publicId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/claim/${id}${wantsRemoval ? "?kind=removal" : ""}`)}`);

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, public_id, name, city, owner_id")
    .eq("public_id", id)
    .eq("status", "approved")
    .maybeSingle<Row>();
  if (!business) notFound();

  const { data: pending } = await supabase
    .from("business_claims")
    .select("kind")
    .eq("business_id", business.id)
    .eq("user_id", profile.id)
    .eq("status", "pending")
    .returns<{ kind: string }[]>();

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-8">
        <header className="animate-rise flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-kami text-white shadow-[0_10px_30px_rgb(37_99_235/0.3)]">
            <BadgeCheck className="size-7" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">זה העסק שלך?</h1>
          <p className="max-w-sm text-muted">
            <Link href={`/b/${business.public_id}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
              {business.name}
            </Link>
            {business.city ? ` · ${business.city}` : ""}
          </p>
        </header>

        <Card className="animate-rise flex flex-col gap-3 p-5 text-sm text-muted" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
            כדי להגן על העסק מהתחזות, כל בקשה נבדקת ידנית ע״י הצוות. עד שהבקשה מאושרת לא משתנה כלום בעמוד.
          </p>
          <p className="flex items-start gap-2.5">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand" />
            נחזור אליך תוך כמה ימי עסקים. לאחר האישור העמוד עובר לניהולך ואפשר לערוך בו הכול.
          </p>
        </Card>

        <Card className="animate-rise p-7" style={{ "--i": 2 } as React.CSSProperties}>
          {business.owner_id ? (
            <FormMessage error="העמוד הזה כבר מנוהל ע״י בעל העסק. אם לדעתך מדובר בטעות, פנו אלינו דרך עמוד צור קשר." />
          ) : pending?.length ? (
            <FormMessage message="שלחת כבר בקשה לגבי העמוד הזה, והיא בבדיקה. נעדכן אותך." />
          ) : (
            <ClaimForm
              businessId={business.id}
              defaultName={profile.full_name}
              defaultPhone={profile.phone ?? ""}
              isBusinessAccount={profile.account_type === "business_owner"}
              defaultKind={wantsRemoval ? "removal" : undefined}
            />
          )}
        </Card>
      </main>
    </PageTransition>
  );
}
