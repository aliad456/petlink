"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { SPECIES, type Species } from "@/lib/pets";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Writes go through RLS with the owner's session; limits and the profanity
// filter live in database triggers (see *_pets.sql).

export type PetResult = { ok?: string; error?: string };

function petError(error: PostgrestError): PetResult {
  if (error.hint === "profanity") return { error: "נמצאה מילה לא מתאימה. נסו לנסח אחרת." };
  if (error.hint === "pet_limit") return { error: "אפשר עד 10 חיות בחשבון." };
  if (error.hint === "photo_limit") return { error: "אפשר עד 12 תמונות לכל חיה." };
  if (error.code === "42501") return { error: "אין הרשאה לפעולה הזו." };
  return { error: "השמירה נכשלה. נסו שוב." };
}

function refresh(petId?: string) {
  revalidatePath("/account");
  if (petId) revalidatePath(`/account/pets/${petId}`);
  revalidatePath("/business/pets");
}

const speciesKeys = Object.keys(SPECIES) as [Species, ...Species[]];

// ─── יצירה ───

export type CreatePetState = PetResult & { fields?: { name: string; species: string } };

export async function createPet(_: CreatePetState, formData: FormData): Promise<CreatePetState> {
  const profile = await requireUser();
  const fields = { name: String(formData.get("name") ?? ""), species: String(formData.get("species") ?? "") };
  const parsed = z
    .object({ name: z.string().trim().min(1, "איך קוראים לה/לו?").max(40), species: z.enum(speciesKeys, { error: "בחרו סוג" }) })
    .safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  if (profile.account_type !== "pet_owner") return { error: "חיות מחמד אפשר להוסיף מחשבון של בעל/ת חיית מחמד.", fields };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pets")
    .insert({ owner_id: profile.id, ...parsed.data })
    .select("id")
    .single<{ id: string }>();
  if (error) return { ...petError(error), fields };
  refresh();
  redirect(`/account/pets/${data.id}?welcome=1`);
}

// ─── פרטים ───

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(""))
  .transform((v) => v || null);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const petSchema = z.object({
  name: z.string().trim().min(1, "חסר שם").max(40),
  species: z.enum(speciesKeys),
  breed: text(60),
  sex: z.enum(["male", "female", "unknown"]),
  birth_date: day,
  birth_date_estimated: z.boolean(),
  weight_kg: z.number().positive().max(199).nullable(),
  neutered: z.boolean().nullable(),
  microchip: text(20),
  medical_notes: text(1000),
  notes: text(1000),
  adopted: z.boolean(),
  adopted_from_business: z.string().refine(isUuid).nullable(),
  adopted_from_text: text(80),
  adopted_on: day,
});

export type PetInput = z.input<typeof petSchema>;

export async function savePet(id: string, input: PetInput): Promise<PetResult> {
  await requireUser();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const parsed = petSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("pets").update(parsed.data).eq("id", id);
  if (error) return petError(error);
  refresh(id);
  return { ok: "נשמר" };
}

export async function deletePet(id: string): Promise<PetResult> {
  await requireUser();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.from("pets").delete().eq("id", id);
  if (error) return petError(error);
  refresh();
  redirect("/account");
}

// ─── תמונות (הדפדפן מעלה ל-pet-media/<user>/<pet>/…; כאן רק רושמים) ───

async function ownsPath(path: string, petId: string) {
  const profile = await requireUser();
  return path.startsWith(`${profile.id}/${petId}/`) && !path.includes("..");
}

export async function setPetAvatar(petId: string, path: string | null): Promise<PetResult> {
  if (!isUuid(petId) || (path && !(await ownsPath(path, petId)))) return { error: "נתיב לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.from("pets").update({ avatar_path: path }).eq("id", petId);
  if (error) return petError(error);
  refresh(petId);
  return { ok: path ? "תמונת הפרופיל עודכנה" : "התמונה הוסרה" };
}

export async function addPetPhotos(petId: string, paths: string[]): Promise<PetResult> {
  if (!isUuid(petId)) return { error: "מזהה לא תקין" };
  for (const p of paths) if (!(await ownsPath(p, petId))) return { error: "נתיב לא תקין" };
  const supabase = await createClient();
  const { count } = await supabase.from("pet_photos").select("id", { count: "exact", head: true }).eq("pet_id", petId);
  const { error } = await supabase
    .from("pet_photos")
    .insert(paths.map((path, i) => ({ pet_id: petId, path, sort_order: (count ?? 0) + i })));
  if (error) return petError(error);
  refresh(petId);
  return { ok: paths.length === 1 ? "התמונה נוספה" : "התמונות נוספו" };
}

export async function removePetPhoto(petId: string, photoId: string): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId) || !isUuid(photoId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { data } = await supabase.from("pet_photos").delete().eq("id", photoId).eq("pet_id", petId).select("path").maybeSingle<{ path: string }>();
  if (data?.path) await supabase.storage.from("pet-media").remove([data.path]);
  refresh(petId);
  return { ok: "התמונה נמחקה" };
}

// ─── חיסונים ───

const vaccineSchema = z.object({
  name: z.string().trim().min(1, "איזה חיסון?").max(60),
  given_on: day,
  next_due: day,
  notes: text(200),
});

export async function addVaccine(petId: string, input: z.input<typeof vaccineSchema>): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId)) return { error: "מזהה לא תקין" };
  const parsed = vaccineSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("pet_vaccines").insert({ pet_id: petId, ...parsed.data });
  if (error) return petError(error);
  refresh(petId);
  return { ok: "החיסון נוסף" };
}

export async function removeVaccine(petId: string, id: string): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId) || !isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.from("pet_vaccines").delete().eq("id", id).eq("pet_id", petId);
  if (error) return petError(error);
  refresh(petId);
  return { ok: "החיסון נמחק" };
}

// ─── שיתוף ───

export async function sharePet(petId: string, businessId: string, on: boolean): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId) || !isUuid(businessId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("pet_shares").upsert({ pet_id: petId, business_id: businessId }, { ignoreDuplicates: true })
    : await supabase.from("pet_shares").delete().eq("pet_id", petId).eq("business_id", businessId);
  if (error) return error.code === "42501" ? { error: "אפשר לשתף רק עם עסק שמנוהל ע״י בעליו." } : petError(error);
  refresh(petId);
  return { ok: on ? "שותף עם העסק" : "השיתוף בוטל" };
}

export async function setShareLink(petId: string, enabled: boolean): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.from("pets").update({ share_link_enabled: enabled }).eq("id", petId);
  if (error) return petError(error);
  refresh(petId);
  return { ok: enabled ? "הקישור פעיל" : "הקישור כובה" };
}

export async function rotateShareLink(petId: string): Promise<PetResult> {
  await requireUser();
  if (!isUuid(petId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("rotate_pet_share_token", { p_pet: petId });
  if (error) return petError(error);
  refresh(petId);
  return { ok: "נוצר קישור חדש. הקישור הקודם כבר לא עובד." };
}

export type ShareTarget = { id: string; public_id: number; name: string; city: string | null; category: string | null };

// Businesses you can share with: approved and managed by their owner.
export async function findBusinesses(q: string): Promise<ShareTarget[]> {
  await requireUser();
  const term = q.trim().replace(/[%_,()]/g, " ").slice(0, 40);
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, public_id, name, city, owner_id, category:categories(name)")
    .eq("status", "approved")
    .not("owner_id", "is", null)
    .ilike("name", `%${term}%`)
    .limit(8)
    .returns<{ id: string; public_id: number; name: string; city: string | null; category: { name: string } | null }[]>();
  return (data ?? []).map((b) => ({ id: b.id, public_id: b.public_id, name: b.name, city: b.city, category: b.category?.name ?? null }));
}
