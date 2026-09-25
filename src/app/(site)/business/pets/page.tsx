import { MessageCircle, PawPrint, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/own";
import { formatRelative } from "@/lib/format";
import { petMediaUrl, SPECIES, type Species } from "@/lib/pets";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "חיות ששותפו איתי", robots: { index: false } };

type Row = {
  pet_id: string;
  name: string;
  species: Species;
  breed: string | null;
  avatar_path: string | null;
  owner_name: string;
  owner_phone: string | null;
  shared_at: string;
};

function wa(phone: string) {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? `972${d.slice(1)}` : d}`;
}

export default async function SharedPetsPage() {
  await requireUser();
  const business = await getOwnBusiness();
  const supabase = await createClient();
  const rows = business ? ((await supabase.rpc("business_shared_pets")).data as Row[] | null) : [];

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">חיות ששותפו איתי</h1>
          <p className="text-muted">לקוחות ששיתפו עם {business?.name ?? "העסק"} את הפרופיל של חיית המחמד שלהם: תמונות, חיסונים והערות.</p>
        </header>
        {!business ? (
          <Card className="py-10 text-center text-muted">הדף הזה לבעלי עסקים ב-Kami.</Card>
        ) : !rows?.length ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <PawPrint className="size-10 text-muted" />
            <p className="font-semibold">עוד לא שיתפו איתך חיות</p>
            <p className="max-w-sm text-sm text-muted">
              לקוחות משתפים מהעמוד שלך ב-Kami, בכפתור ״שיתוף חיית המחמד שלי״. ספרו להם על זה!
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const avatar = petMediaUrl(r.avatar_path);
              return (
                <li key={r.pet_id} className="glass-lite animate-rise flex items-center gap-4 rounded-[1.5rem] p-3 pe-4" style={{ "--i": i } as CSSProperties}>
                  <Link href={`/business/pets/${r.pet_id}`} transitionTypes={["nav-forward"]} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--glass-bg-strong)] text-3xl">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- owner's photo
                        <img src={avatar} alt="" className="size-full object-cover" />
                      ) : (
                        SPECIES[r.species].emoji
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{r.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {r.breed || SPECIES[r.species].label} · {r.owner_name} · {formatRelative(r.shared_at)}
                      </span>
                    </span>
                  </Link>
                  {r.owner_phone && (
                    <span className="flex shrink-0 gap-1.5">
                      <a href={`tel:${r.owner_phone}`} aria-label={`התקשרות ל${r.owner_name}`} className="pressable focus-ring glass inline-flex size-10 items-center justify-center rounded-full">
                        <Phone className="size-4" />
                      </a>
                      <a href={wa(r.owner_phone)} target="_blank" rel="noreferrer" aria-label={`וואטסאפ ל${r.owner_name}`} className="pressable focus-ring glass inline-flex size-10 items-center justify-center rounded-full">
                        <MessageCircle className="size-4 text-[#128c7e] dark:text-[#25d366]" />
                      </a>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </PageTransition>
  );
}
