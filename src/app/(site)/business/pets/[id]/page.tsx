import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { PetProfile } from "@/components/pets/pet-profile";
import { buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { PET_COLUMNS, type Pet, type PetVaccine } from "@/lib/pets";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { RemoveSharedPet } from "./remove-button";

export const metadata: Metadata = { title: "פרופיל חיית מחמד", robots: { index: false } };

// A pet a customer shared with this business. RLS lets the business owner
// read it only while the share exists.
export default async function SharedPetPage({ params }: PageProps<"/business/pets/[id]">) {
  await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: pet }, { data: photos }, { data: vaccines }, { data: contact }] = await Promise.all([
    supabase.from("pets").select(PET_COLUMNS).eq("id", id).maybeSingle<Pet>(),
    supabase.from("pet_photos").select("path").eq("pet_id", id).order("sort_order").returns<{ path: string }[]>(),
    supabase
      .from("pet_vaccines")
      .select("id, name, given_on, next_due, notes")
      .eq("pet_id", id)
      .order("given_on", { ascending: false, nullsFirst: false })
      .returns<(PetVaccine & { id: string })[]>(),
    supabase.rpc("pet_owner_contact", { p_pet: id }).maybeSingle<{ full_name: string; phone: string | null; email: string | null }>(),
  ]);
  if (!pet || !contact) notFound();
  const { data: org } = pet.adopted_from_business
    ? await supabase.from("businesses").select("name").eq("id", pet.adopted_from_business).maybeSingle<{ name: string }>()
    : { data: null };
  const phone = contact.phone;
  const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "972")}` : null;

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-6">
        <Link href="/business/pets" transitionTypes={["nav-back"]} className="text-sm text-muted hover:text-foreground">
          ← חיות ששותפו איתי
        </Link>
        <div className="glass-lite flex flex-wrap items-center gap-3 rounded-[1.5rem] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">הבעלים</p>
            <p className="font-bold">{contact.full_name}</p>
          </div>
          {phone && (
            <>
              <a href={`tel:${phone}`} className={buttonClass({ size: "sm" })}>
                <Phone className="size-4" />
                {phone}
              </a>
              <a href={wa!} target="_blank" rel="noreferrer" className={buttonClass({ variant: "glass", size: "sm" })}>
                <MessageCircle className="size-4 text-[#128c7e] dark:text-[#25d366]" />
                וואטסאפ
              </a>
            </>
          )}
        </div>
        <PetProfile
          pet={{ ...pet, photos: (photos ?? []).map((p) => p.path), vaccines: vaccines ?? [], adopted_from_name: org?.name ?? null }}
          footer={
            <div className="flex justify-center">
              <RemoveSharedPet petId={pet.id} />
            </div>
          }
        />
      </main>
    </PageTransition>
  );
}
