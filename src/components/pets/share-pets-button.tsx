"use client";

import { Check, PawPrint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sharePet } from "@/app/(site)/account/pets/actions";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { buttonClass, cn } from "@/components/ui";
import { petMediaUrl, SPECIES, type Species } from "@/lib/pets";

type MyPet = { id: string; name: string; species: Species; avatar_path: string | null; shared: boolean };

// On a business page: share one or more of my pets' profiles with this business.
export function SharePetsButton({ businessId, businessName, pets }: { businessId: string; businessName: string; pets: MyPet[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const sharedCount = pets.filter((p) => p.shared).length;

  const toggle = (p: MyPet) =>
    start(async () => {
      const r = await sharePet(p.id, businessId, !p.shared);
      if (r.error) return void toast.error(r.error);
      toast.success(p.shared ? `${p.name} כבר לא משותף/ת` : `${p.name} שותף/ה עם ${businessName}`);
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable focus-ring mt-3 flex w-full items-center gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--accent-from)_10%,transparent)] px-4 py-3 text-start"
      >
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-white">
          <PawPrint className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{sharedCount ? "הפרופיל משותף עם העסק" : "שיתוף חיית המחמד שלי"}</span>
          <span className="block text-xs text-muted">
            {sharedCount ? `${pets.filter((p) => p.shared).map((p) => p.name).join(", ")} · לחצו לשינוי` : "תמונות, חיסונים והערות, כדי שיכירו אותה/אותו מראש"}
          </span>
        </span>
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`שיתוף עם ${businessName}`}
        description="העסק יראה את הפרופיל, התמונות והחיסונים, ואת השם והטלפון שלך. אפשר לבטל בכל רגע."
      >
        {pets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-muted">עוד אין לך פרופיל לחיית מחמד.</p>
            <Link href="/account/pets/new" className={buttonClass()}>
              יצירת פרופיל
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {pets.map((p) => {
              const avatar = petMediaUrl(p.avatar_path);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={pending}
                    aria-pressed={p.shared}
                    onClick={() => toggle(p)}
                    className={cn(
                      "pressable focus-ring flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-start",
                      p.shared ? "border-transparent bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]" : "border-[var(--border)]",
                    )}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--glass-bg-strong)] text-2xl">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- owner's photo
                        <img src={avatar} alt="" className="size-full object-cover" />
                      ) : (
                        SPECIES[p.species].emoji
                      )}
                    </span>
                    <span className="flex-1 font-semibold">{p.name}</span>
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-full border-2",
                        p.shared ? "border-brand bg-brand text-white" : "border-[var(--border)]",
                      )}
                    >
                      {p.shared && <Check className="size-4" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </>
  );
}
