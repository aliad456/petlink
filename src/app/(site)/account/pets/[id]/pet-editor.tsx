"use client";

import {
  Camera,
  Copy,
  ExternalLink,
  HeartHandshake,
  ImagePlus,
  Link2,
  MessageCircle,
  NotebookPen,
  RefreshCw,
  Search,
  Share2,
  Stethoscope,
  Store,
  Syringe,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, ChoiceTile, cn, FormMessage, Input, Label, Spinner, Switch, Textarea } from "@/components/ui";
import { compressImage } from "@/lib/business/media";
import { PET_BUCKET, petMediaUrl, SEX_LABEL, shortDay, SPECIES, type Pet, type PetVaccine, type Species } from "@/lib/pets";
import { createClient } from "@/lib/supabase/client";
import {
  addPetPhotos,
  addVaccine,
  deletePet,
  findBusinesses,
  removePetPhoto,
  removeVaccine,
  rotateShareLink,
  savePet,
  setPetAvatar,
  setShareLink,
  sharePet,
  type PetInput,
  type PetResult,
  type ShareTarget,
} from "../actions";

type Photo = { id: string; path: string };
type Shared = { business_id: string; name: string; public_id: number; city: string | null };
type Org = { id: string; name: string; city: string | null };

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (job: () => Promise<PetResult>, after?: () => void) =>
    start(async () => {
      const r = await job();
      if (r.error) return void toast.error(r.error);
      if (r.ok) toast.success(r.ok);
      after?.();
      router.refresh();
    });
  return [pending, run] as const;
}

async function upload(userId: string, petId: string, file: File, maxSide: number) {
  const blob = await compressImage(file, maxSide);
  const path = `${userId}/${petId}/${crypto.randomUUID()}.webp`;
  const { error } = await createClient()
    .storage.from(PET_BUCKET)
    .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

export function PetEditor({
  userId,
  pet,
  photos,
  vaccines,
  shares,
  orgs,
  welcome,
}: {
  userId: string;
  pet: Pet;
  photos: Photo[];
  vaccines: (PetVaccine & { id: string })[];
  shares: Shared[];
  orgs: Org[];
  welcome: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <AvatarHeader userId={userId} pet={pet} welcome={welcome} />
      <DetailsForm pet={pet} orgs={orgs} />
      <PhotosSection userId={userId} pet={pet} photos={photos} />
      <VaccinesSection pet={pet} vaccines={vaccines} />
      <ShareSection pet={pet} shares={shares} />
      <DangerZone pet={pet} />
    </div>
  );
}

function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="glass-lite flex flex-col gap-4 rounded-[1.75rem] p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          {icon}
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// ─── תמונת פרופיל ───

function AvatarHeader({ userId, pet, welcome }: { userId: string; pet: Pet; welcome: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [, run] = useRun();
  const avatar = petMediaUrl(pet.avatar_path);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="pressable focus-ring group relative rounded-full bg-[conic-gradient(from_200deg,#4ade80,#22d3ee,#3b82f6,#22d3ee,#4ade80)] p-[3px]"
        aria-label="החלפת תמונת פרופיל"
      >
        <span className="flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--background)] bg-[var(--background)] text-6xl">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner's photo
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            SPECIES[pet.species].emoji
          )}
        </span>
        <span className="absolute bottom-1 end-1 inline-flex size-10 items-center justify-center rounded-full bg-foreground text-background shadow-lg">
          {busy ? <Spinner className="size-4" /> : <Camera className="size-5" />}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            const path = await upload(userId, pet.id, f, 800);
            run(() => setPetAvatar(pet.id, path));
          } catch {
            toast.error("ההעלאה נכשלה. נסו שוב.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <h1 className="text-3xl font-extrabold tracking-tight">{pet.name}</h1>
      {welcome && (
        <p className="animate-rise max-w-sm rounded-2xl bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] px-4 py-3 text-sm text-brand-strong dark:text-brand">
          🎉 הפרופיל של {pet.name} נוצר! הוסיפו תמונה, חיסונים ופרטים, ואז אפשר לשתף עם הווטרינר או הספר.
        </p>
      )}
    </div>
  );
}

// ─── פרטים ───

function DetailsForm({ pet, orgs }: { pet: Pet; orgs: Org[] }) {
  const [f, setF] = useState<PetInput>({
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? "",
    sex: pet.sex,
    birth_date: pet.birth_date ?? "",
    birth_date_estimated: pet.birth_date_estimated,
    weight_kg: pet.weight_kg == null ? null : Number(pet.weight_kg),
    neutered: pet.neutered,
    microchip: pet.microchip ?? "",
    medical_notes: pet.medical_notes ?? "",
    notes: pet.notes ?? "",
    adopted: pet.adopted,
    adopted_from_business: pet.adopted_from_business,
    adopted_from_text: pet.adopted_from_text ?? "",
    adopted_on: pet.adopted_on ?? "",
  });
  const [pending, run] = useRun();
  const set = <K extends keyof PetInput>(k: K, v: PetInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const she = f.sex === "female";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePet(pet.id, f));
      }}
    >
      <Section icon={<NotebookPen className="size-5 text-brand" />} title="פרטים">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            שם
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={40} required />
          </Label>
          <Label>
            סוג
            <select
              value={f.species}
              onChange={(e) => set("species", e.target.value as Species)}
              className="glass focus-ring h-12 w-full rounded-2xl px-4 text-base"
            >
              {(Object.keys(SPECIES) as Species[]).map((s) => (
                <option key={s} value={s}>
                  {SPECIES[s].emoji} {SPECIES[s].label}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            גזע (לא חובה)
            <Input value={f.breed ?? ""} onChange={(e) => set("breed", e.target.value)} maxLength={60} placeholder="למשל: לברדור, מעורב" />
          </Label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">מין</legend>
            <div className="grid grid-cols-3 gap-2">
              {(["male", "female", "unknown"] as const).map((s) => (
                <ChoiceTile key={s} type="radio" name="sex" checked={f.sex === s} onChange={() => set("sex", s)} className="py-2.5">
                  {SEX_LABEL[s]}
                </ChoiceTile>
              ))}
            </div>
          </fieldset>
          <Label>
            תאריך לידה
            <Input type="date" dir="ltr" value={f.birth_date ?? ""} onChange={(e) => set("birth_date", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            <span className="flex items-center gap-2 text-xs font-normal text-muted">
              <input
                type="checkbox"
                checked={f.birth_date_estimated}
                onChange={(e) => set("birth_date_estimated", e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              תאריך משוער (למשל אם {she ? "אומצה" : "אומץ"})
            </span>
          </Label>
          <Label>
            משקל (ק״ג)
            <Input
              dir="ltr"
              inputMode="decimal"
              value={f.weight_kg ?? ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                set("weight_kg", v ? Number(v) : null);
              }}
              placeholder="12.5"
            />
          </Label>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{she ? "מעוקרת?" : "מסורס / מעוקר?"}</legend>
            <div className="grid grid-cols-3 gap-2">
              {([
                [true, "כן"],
                [false, "לא"],
                [null, "לא ידוע"],
              ] as const).map(([v, l]) => (
                <ChoiceTile key={l} type="radio" name="neutered" checked={f.neutered === v} onChange={() => set("neutered", v)} className="py-2.5">
                  {l}
                </ChoiceTile>
              ))}
            </div>
          </fieldset>
          <Label>
            מספר שבב (לא חובה)
            <Input dir="ltr" value={f.microchip ?? ""} onChange={(e) => set("microchip", e.target.value)} maxLength={20} />
          </Label>
        </div>
        <Label>
          בריאות: אלרגיות, מחלות, תרופות
          <Textarea value={f.medical_notes ?? ""} onChange={(e) => set("medical_notes", e.target.value)} maxLength={1000} className="min-h-20" />
        </Label>
        <Label>
          על {f.name || "החיה"}: אופי, הרגלים, איך אוהב/ת להסתפר
          <Textarea
            value={f.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            maxLength={1000}
            className="min-h-20"
            placeholder="למשל: לחוץ מפני מייבש שיער, אוהב חטיפים, תספורת קצרה בקיץ"
          />
        </Label>
      </Section>

      <Section
        icon={<HeartHandshake className="size-5 text-rose-500" />}
        title="אימוץ"
        hint="אם החיה אומצה מעמותה ב-Kami, העמותה תקבל את הקרדיט בעמוד שלה."
      >
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium">{she ? "אומצה" : "אומץ"}</span>
          <Switch checked={f.adopted} onChange={(v) => set("adopted", v)} label="אומץ" />
        </div>
        {f.adopted && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              מאיפה?
              <select
                value={f.adopted_from_business ?? ""}
                onChange={(e) => set("adopted_from_business", e.target.value || null)}
                className="glass focus-ring h-12 w-full rounded-2xl px-4 text-base"
              >
                <option value="">עמותה אחרת / מקום אחר</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                    {o.city ? ` · ${o.city}` : ""}
                  </option>
                ))}
              </select>
            </Label>
            {!f.adopted_from_business && (
              <Label>
                שם העמותה / המקום
                <Input value={f.adopted_from_text ?? ""} onChange={(e) => set("adopted_from_text", e.target.value)} maxLength={80} />
              </Label>
            )}
            <Label>
              מתי?
              <Input type="date" dir="ltr" value={f.adopted_on ?? ""} onChange={(e) => set("adopted_on", e.target.value)} />
            </Label>
          </div>
        )}
      </Section>

      <Button type="submit" size="lg" loading={pending} className="sticky bottom-4 z-10 self-center shadow-xl">
        שמירת הפרטים
      </Button>
    </form>
  );
}

// ─── תמונות ───

function PhotosSection({ userId, pet, photos }: { userId: string; pet: Pet; photos: Photo[] }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [, run] = useRun();

  return (
    <Section icon={<ImagePlus className="size-5 text-brand" />} title="תמונות" hint={`עד 12 תמונות. עוזר לספר לראות את הפרווה, ולווטרינר לראות משהו שמדאיג אתכם.`}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <div key={p.id} className="group relative overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner's photo */}
            <img src={petMediaUrl(p.path)!} alt="" className="aspect-square w-full object-cover" />
            <button
              type="button"
              aria-label="מחיקת התמונה"
              onClick={() => run(() => removePetPhoto(pet.id, p.id))}
              className="pressable focus-ring absolute end-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < 12 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="pressable focus-ring flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[color-mix(in_oklab,var(--muted)_35%,transparent)] text-sm text-muted"
          >
            {busy ? <Spinner className="size-5" /> : <ImagePlus className="size-6" />}
            הוספה
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, 12 - photos.length);
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          try {
            const paths = await Promise.all(files.map((f) => upload(userId, pet.id, f, 1600)));
            run(() => addPetPhotos(pet.id, paths));
          } catch {
            toast.error("ההעלאה נכשלה. נסו שוב.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Section>
  );
}

// ─── חיסונים ───

function VaccinesSection({ pet, vaccines }: { pet: Pet; vaccines: (PetVaccine & { id: string })[] }) {
  const empty = { name: "", given_on: "", next_due: "", notes: "" };
  const [v, setV] = useState(empty);
  const [pending, run] = useRun();

  return (
    <Section icon={<Syringe className="size-5 text-brand" />} title="חיסונים וטיפולים" hint="הווטרינר יראה מה ניתן ומה הבא בתור.">
      {vaccines.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {vaccines.map((x) => (
            <li key={x.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm">
              <Stethoscope className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{x.name}</span>
                <span className="block text-xs text-muted">
                  {x.given_on ? `ניתן ${shortDay(x.given_on)}` : ""}
                  {x.next_due ? ` · הבא ${shortDay(x.next_due)}` : ""}
                  {x.notes ? ` · ${x.notes}` : ""}
                </span>
              </span>
              <button
                type="button"
                aria-label={`מחיקת ${x.name}`}
                onClick={() => run(() => removeVaccine(pet.id, x.id))}
                className="pressable focus-ring rounded-full p-1.5 text-muted hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid gap-3 rounded-2xl bg-[var(--glass-bg)] p-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addVaccine(pet.id, v), () => setV(empty));
        }}
      >
        <Label className="sm:col-span-2">
          חיסון / טיפול
          <Input
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            maxLength={60}
            placeholder="למשל: משושה, כלבת, תילוע, טיפול נגד פרעושים"
            list="vaccine-names"
            required
            className="h-11"
          />
          <datalist id="vaccine-names">
            {["משושה", "כלבת", "מרובע (חתולים)", "תולעת הפארק", "תילוע", "טיפול נגד פרעושים וקרציות", "שיעול מכלאות"].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Label>
        <Label>
          ניתן בתאריך
          <Input type="date" dir="ltr" value={v.given_on} onChange={(e) => setV({ ...v, given_on: e.target.value })} className="h-11" />
        </Label>
        <Label>
          הבא בתאריך
          <Input type="date" dir="ltr" value={v.next_due} onChange={(e) => setV({ ...v, next_due: e.target.value })} className="h-11" />
        </Label>
        <Button type="submit" size="sm" variant="glass" loading={pending} className="sm:col-span-2 sm:justify-self-start">
          הוספה לרשימה
        </Button>
      </form>
    </Section>
  );
}

// ─── שיתוף ───

function ShareSection({ pet, shares }: { pet: Pet; shares: Shared[] }) {
  const [pending, run] = useRun();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ShareTarget[]>([]);
  const [searching, startSearch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const url = () => `${window.location.origin}/pet/${pet.share_token}`;
  const sharedIds = new Set(shares.map((s) => s.business_id));

  return (
    <Section
      icon={<Share2 className="size-5 text-brand" />}
      title="שיתוף עם עסק"
      hint="העסק יראה את הפרופיל, התמונות והחיסונים, ואת השם והטלפון שלך. אפשר לבטל בכל רגע."
    >
      {/* עסקים ב-Kami */}
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Store className="size-4" />
          עסקים ב-Kami
        </span>
        {shares.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {shares.map((s) => (
              <li key={s.business_id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-3 py-2 text-sm">
                <Link href={`/b/${s.public_id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {s.name}
                  {s.city && <span className="font-normal text-muted"> · {s.city}</span>}
                </Link>
                <Button size="sm" variant="glass" onClick={() => run(() => sharePet(pet.id, s.business_id, false))}>
                  ביטול שיתוף
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => startSearch(async () => setResults(await findBusinesses(v))), 250);
            }}
            placeholder="חיפוש עסק לפי שם (וטרינר, ספר…)"
            className="h-11 ps-10"
          />
        </div>
        {q.trim().length >= 2 && (
          <ul className="flex flex-col gap-1">
            {searching && <li className="px-3 py-2 text-sm text-muted">מחפש…</li>}
            {!searching && results.length === 0 && <li className="px-3 py-2 text-sm text-muted">לא נמצאו עסקים בשם הזה</li>}
            {results.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-[var(--glass-bg)]">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-muted"> · {[b.category, b.city].filter(Boolean).join(" · ")}</span>
                </span>
                {sharedIds.has(b.id) ? (
                  <span className="text-xs font-semibold text-success">שותף</span>
                ) : (
                  <Button size="sm" loading={pending} onClick={() => run(() => sharePet(pet.id, b.id, true), () => setQ(""))}>
                    שיתוף
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* קישור */}
      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="size-4" />
              קישור לשליחה
            </span>
            <span className="block text-xs text-muted">לכל וטרינר או ספר, גם אם הוא לא ב-Kami. בלי שם ובלי טלפון.</span>
          </span>
          <Switch checked={pet.share_link_enabled} onChange={(v) => run(() => setShareLink(pet.id, v))} label="קישור פעיל" />
        </div>
        {pet.share_link_enabled && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="glass"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url());
                  toast.success("הקישור הועתק");
                } catch {
                  toast.error("לא הצלחנו להעתיק");
                }
              }}
            >
              <Copy className="size-4" />
              העתקה
            </Button>
            <Button
              size="sm"
              variant="glass"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`הפרופיל של ${pet.name}: ${url()}`)}`, "_blank", "noopener")}
            >
              <MessageCircle className="size-4 text-[#128c7e] dark:text-[#25d366]" />
              וואטסאפ
            </Button>
            <a href={`/pet/${pet.share_token}`} target="_blank" className={cn("pressable focus-ring inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold glass")}>
              <ExternalLink className="size-4" />
              איך זה נראה
            </a>
            <Button size="sm" variant="glass" onClick={() => run(() => rotateShareLink(pet.id))} title="הקישור הקודם יפסיק לעבוד">
              <RefreshCw className="size-4" />
              קישור חדש
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── מחיקה ───

function DangerZone({ pet }: { pet: Pet }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="flex justify-center">
      <Button variant="glass" size="sm" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        מחיקת הפרופיל של {pet.name}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`למחוק את ${pet.name}?`} description="הפרופיל, התמונות, החיסונים והשיתופים יימחקו לצמיתות.">
        <FormMessage error={error} />
        <div className="flex flex-row-reverse gap-2.5">
          <Button
            variant="danger"
            className="flex-1"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await deletePet(pet.id);
                if (r?.error) setError(r.error);
              })
            }
          >
            מחיקה
          </Button>
          <Button variant="glass" className="flex-1" onClick={() => setOpen(false)}>
            ביטול
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
