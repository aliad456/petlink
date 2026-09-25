import { HeartHandshake, NotebookPen, Stethoscope, Syringe } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui";
import { petAge, petMediaUrl, SEX_LABEL, shortDay, SPECIES, type Pet, type PetVaccine } from "@/lib/pets";

export type PetProfileData = Omit<Pet, "share_token" | "share_link_enabled" | "created_at"> & {
  photos: string[];
  vaccines: PetVaccine[];
  adopted_from_name?: string | null;
};

// Today and today+30 in Israel (for "due soon" / "overdue" on vaccines).
function dueWindow() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" });
  const now = new Date();
  return { now: fmt.format(now), soon: fmt.format(new Date(now.getTime() + 30 * 86_400_000)) };
}

// Read-only pet card: what a vet / groomer sees (share link or shared in-app).
export function PetProfile({ pet, footer }: { pet: PetProfileData; footer?: ReactNode }) {
  const avatar = petMediaUrl(pet.avatar_path);
  const species = SPECIES[pet.species];
  const age = petAge(pet);
  const { now, soon } = dueWindow();
  const facts = [
    species && `${species.emoji} ${species.label}`,
    pet.breed,
    age,
    pet.sex !== "unknown" && SEX_LABEL[pet.sex],
    pet.neutered === true && (pet.sex === "female" ? "מעוקרת" : "מסורס/מעוקר"),
    pet.weight_kg && `${Number(pet.weight_kg)} ק״ג`,
  ].filter(Boolean) as string[];
  const adoptedFrom = pet.adopted_from_name ?? pet.adopted_from_text;

  return (
    <article className="flex flex-col gap-5">
      <header className="glass animate-rise flex flex-col items-center gap-3 rounded-[2rem] px-5 pb-6 pt-7 text-center">
        <span className="rounded-full bg-[conic-gradient(from_200deg,#4ade80,#22d3ee,#3b82f6,#22d3ee,#4ade80)] p-[3px] shadow-[0_10px_30px_rgb(34_211_238/0.3)]">
          <span className="flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--background)] text-6xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- owner's photo
              <img src={avatar} alt={pet.name} className="size-full object-cover" />
            ) : (
              species?.emoji
            )}
          </span>
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">{pet.name}</h1>
        <ul className="flex flex-wrap justify-center gap-1.5">
          {facts.map((f) => (
            <li key={f} className="rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-sm font-medium">
              {f}
            </li>
          ))}
        </ul>
        {pet.adopted && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/12 px-3 py-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
            <HeartHandshake className="size-4" />
            {pet.sex === "female" ? "אומצה" : "אומץ"}
            {adoptedFrom ? ` מ${adoptedFrom}` : ""}
            {pet.adopted_on ? ` · ${shortDay(pet.adopted_on)}` : ""}
          </p>
        )}
        {pet.microchip && (
          <p className="text-xs text-muted">
            שבב: <span dir="ltr">{pet.microchip}</span>
          </p>
        )}
      </header>

      {(pet.medical_notes || pet.vaccines.length > 0) && (
        <section className="glass-lite animate-rise flex flex-col gap-4 rounded-[1.75rem] p-5" style={{ "--i": 1 } as React.CSSProperties}>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Stethoscope className="size-5 text-brand" />
            בריאות
          </h2>
          {pet.medical_notes && <p className="whitespace-pre-line leading-relaxed">{pet.medical_notes}</p>}
          {pet.vaccines.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--glass-bg)] text-muted">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <Syringe className="size-4" />
                        חיסון / טיפול
                      </span>
                    </th>
                    <th className="px-3 py-2 text-start font-semibold">ניתן</th>
                    <th className="px-3 py-2 text-start font-semibold">הבא</th>
                  </tr>
                </thead>
                <tbody>
                  {pet.vaccines.map((v, i) => (
                    <tr key={v.id ?? i} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 font-medium">
                        {v.name}
                        {v.notes && <span className="block text-xs font-normal text-muted">{v.notes}</span>}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{shortDay(v.given_on) || "—"}</td>
                      <td
                        className={cn(
                          "px-3 py-2 font-semibold tabular-nums",
                          v.next_due && v.next_due < now && "text-danger",
                          v.next_due && v.next_due >= now && v.next_due <= soon && "text-warning",
                        )}
                      >
                        {shortDay(v.next_due) || "—"}
                        {v.next_due && v.next_due < now && <span className="block text-xs font-medium">עבר המועד</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {pet.notes && (
        <section className="glass-lite animate-rise flex flex-col gap-3 rounded-[1.75rem] p-5" style={{ "--i": 2 } as React.CSSProperties}>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <NotebookPen className="size-5 text-brand" />
            על {pet.name}
          </h2>
          <p className="whitespace-pre-line leading-relaxed">{pet.notes}</p>
        </section>
      )}

      {pet.photos.length > 0 && (
        <section className="animate-rise grid grid-cols-2 gap-2 sm:grid-cols-3" style={{ "--i": 3 } as React.CSSProperties} aria-label="תמונות">
          {pet.photos.map((p) => (
            <a key={p} href={petMediaUrl(p)!} target="_blank" rel="noreferrer" className="focus-ring overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- owner's photo */}
              <img src={petMediaUrl(p)!} alt="" loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105" />
            </a>
          ))}
        </section>
      )}

      {footer}
    </article>
  );
}
