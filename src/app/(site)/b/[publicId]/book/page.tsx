import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MaintenanceGate } from "@/components/maintenance";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/session";
import { SERVICE_COLUMNS, SETTINGS_COLUMNS, type BookingService, type BookingSettings } from "@/lib/bookings";
import { mediaUrl } from "@/lib/business/media";
import type { Species } from "@/lib/pets";
import { createClient } from "@/lib/supabase/server";
import { BookingWizard } from "./booking-wizard";

export const metadata: Metadata = { title: "קביעת תור", robots: { index: false } };

type Biz = { id: string; public_id: number; name: string; owner_id: string | null; plan: string; avatar_path: string | null };

export default async function BookPage({ params }: PageProps<"/b/[publicId]/book">) {
  const publicId = Number((await params).publicId);
  if (!Number.isInteger(publicId) || publicId <= 0) notFound();
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/b/${publicId}/book`)}`);

  const supabase = await createClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, public_id, name, owner_id, plan, avatar_path")
    .eq("public_id", publicId)
    .eq("status", "approved")
    .maybeSingle<Biz>();
  if (!biz) notFound();

  const [{ data: settings }, { data: services }, { data: pets }] = await Promise.all([
    supabase.from("booking_settings").select(SETTINGS_COLUMNS).eq("business_id", biz.id).maybeSingle<BookingSettings>(),
    supabase
      .from("booking_services")
      .select(SERVICE_COLUMNS)
      .eq("business_id", biz.id)
      .eq("active", true)
      .order("sort_order")
      .order("created_at")
      .returns<BookingService[]>(),
    supabase
      .from("pets")
      .select("id, name, species, avatar_path")
      .eq("owner_id", profile.id)
      .order("created_at")
      .returns<{ id: string; name: string; species: Species; avatar_path: string | null }[]>(),
  ]);
  const open = biz.plan === "pro" && !!settings?.enabled && (services?.length ?? 0) > 0;
  const own = biz.owner_id === profile.id;

  return (
    <MaintenanceGate path="/b/*">
      <PageTransition>
        <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-16 pt-6">
          <Link
            href={`/b/${biz.public_id}`}
            transitionTypes={["nav-back"]}
            className="focus-ring inline-flex items-center gap-1.5 self-start rounded-lg text-sm text-muted hover:text-foreground"
          >
            <ArrowRight className="size-4" />
            {biz.name}
          </Link>
          <header className="flex items-center gap-3">
            <span className="size-14 shrink-0 overflow-hidden rounded-2xl bg-kami">
              {biz.avatar_path && (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase public URL
                <img src={mediaUrl(biz.avatar_path)!} alt="" className="size-full object-cover" />
              )}
            </span>
            <div className="flex min-w-0 flex-col">
              <h1 className="text-2xl font-extrabold tracking-tight">קביעת תור</h1>
              <span className="truncate text-muted">{biz.name}</span>
            </div>
          </header>

          {own ? (
            <Card className="py-10 text-center text-muted">זה העסק שלך. כך הלקוחות רואים את קביעת התור.</Card>
          ) : !open ? (
            <Card className="py-10 text-center text-muted">העסק לא מקבל כרגע תורים אונליין. אפשר ליצור קשר בטלפון או בוואטסאפ.</Card>
          ) : (
            <BookingWizard
              business={{ id: biz.id, publicId: biz.public_id, name: biz.name }}
              settings={settings!}
              services={services!}
              pets={pets ?? []}
              needPhone={!profile.phone?.trim()}
            />
          )}
        </main>
      </PageTransition>
    </MaintenanceGate>
  );
}
