import { PawPrint } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { PetProfile, type PetProfileData } from "@/components/pets/pet-profile";
import { buttonClass } from "@/components/ui";
import type { Pet, PetVaccine } from "@/lib/pets";
import { createPublicClient } from "@/lib/supabase/public";
import { isUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "פרופיל חיית מחמד", robots: { index: false, follow: false } };

type Shared = {
  pet: Omit<Pet, "share_token" | "share_link_enabled">;
  owner_first_name: string;
  adopted_from_name: string | null;
  photos: string[];
  vaccines: PetVaccine[];
};

// Secret link the owner sends to a vet / groomer (works without logging in,
// only while the owner keeps it on).
export default async function SharedPetPage({ params }: PageProps<"/pet/[token]">) {
  const { token } = await params;
  if (!isUuid(token)) notFound();
  const { data } = await createPublicClient().rpc("pet_by_share_token", { p_token: token });
  const shared = data as Shared | null;
  if (!shared) notFound();

  const pet: PetProfileData = {
    ...shared.pet,
    photos: shared.photos,
    vaccines: shared.vaccines,
    adopted_from_name: shared.adopted_from_name,
  };

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-6">
        <p className="text-center text-sm text-muted">
          {shared.owner_first_name ? `${shared.owner_first_name} שיתף/ה איתך` : "שותף איתך"} את הפרופיל של {pet.name} מ-Kami
        </p>
        <PetProfile
          pet={pet}
          footer={
            <div className="glass-lite flex flex-col items-center gap-3 rounded-[1.75rem] p-5 text-center">
              <PawPrint className="size-6 text-brand" />
              <p className="font-semibold">גם לכם יש חיית מחמד?</p>
              <p className="max-w-sm text-sm text-muted">פרופיל אחד עם החיסונים, התמונות וכל מה שחשוב, לשלוח לווטרינר או לספר בלחיצה.</p>
              <Link href="/signup" className={buttonClass()}>
                יצירת פרופיל ב-Kami
              </Link>
            </div>
          }
        />
      </main>
    </PageTransition>
  );
}
