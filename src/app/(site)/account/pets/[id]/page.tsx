import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { requireUser } from "@/lib/auth/session";
import { PET_COLUMNS, type Pet, type PetVaccine } from "@/lib/pets";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { PetEditor } from "./pet-editor";

export const metadata: Metadata = { title: "חיית המחמד שלי", robots: { index: false } };

export default async function PetPage({ params, searchParams }: PageProps<"/account/pets/[id]">) {
  const profile = await requireUser();
  const { id } = await params;
  const { welcome } = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: pet } = await supabase.from("pets").select(PET_COLUMNS).eq("id", id).eq("owner_id", profile.id).maybeSingle<Pet>();
  if (!pet) notFound();

  const [{ data: photos }, { data: vaccines }, { data: shares }, { data: orgCategory }] = await Promise.all([
    supabase.from("pet_photos").select("id, path").eq("pet_id", id).order("sort_order").order("created_at").returns<{ id: string; path: string }[]>(),
    supabase
      .from("pet_vaccines")
      .select("id, name, given_on, next_due, notes")
      .eq("pet_id", id)
      .order("given_on", { ascending: false, nullsFirst: false })
      .returns<(PetVaccine & { id: string })[]>(),
    supabase
      .from("pet_shares")
      .select("business_id, business:businesses(name, public_id, city)")
      .eq("pet_id", id)
      .order("created_at", { ascending: false })
      .returns<{ business_id: string; business: { name: string; public_id: number; city: string | null } | null }[]>(),
    supabase.from("categories").select("id").eq("is_adoption", true).maybeSingle<{ id: string }>(),
  ]);

  // Organisations on Kami (the category marked for adoption) for "adopted from".
  const { data: orgs } = orgCategory
    ? await supabase
        .from("businesses")
        .select("id, name, city")
        .eq("category_id", orgCategory.id)
        .eq("status", "approved")
        .order("name")
        .returns<{ id: string; name: string; city: string | null }[]>()
    : { data: [] };

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-6">
        <Link href="/account" transitionTypes={["nav-back"]} className="text-sm text-muted hover:text-foreground">
          ← החשבון שלי
        </Link>
        <PetEditor
          userId={profile.id}
          pet={pet}
          photos={photos ?? []}
          vaccines={vaccines ?? []}
          shares={(shares ?? [])
            .filter((s) => s.business)
            .map((s) => ({ business_id: s.business_id, name: s.business!.name, public_id: s.business!.public_id, city: s.business!.city }))}
          orgs={orgs ?? []}
          welcome={welcome === "1"}
        />
      </main>
    </PageTransition>
  );
}
