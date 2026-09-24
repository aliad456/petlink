"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/own";
import { ACCENTS, LANGUAGES, SECTION_IDS } from "@/lib/business/types";
import { MEDIA_BUCKET } from "@/lib/business/media";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Writes go through RLS with the owner's own session. Content rules
// (profanity, gallery limit, allowed status changes) are enforced by
// triggers in the database; these actions validate shape and map errors.

export type Result = { ok?: string; error?: string };

function dbError(error: PostgrestError): Result {
  if (error.hint === "profanity" || error.message.startsWith("profanity")) {
    return { error: "נמצאה מילה לא מתאימה באחד השדות. נסו לנסח אחרת." };
  }
  if (error.hint === "gallery_limit") return { error: "הגעתם למקסימום 12 תמונות בגלריה." };
  if (error.code === "42501") return { error: "אין הרשאה לבצע את הפעולה. אם העמוד הושהה, פנו לשירות הלקוחות." };
  return { error: "השמירה נכשלה. נסו שוב." };
}

async function ownBusinessOrThrow() {
  await requireUser();
  const business = await getOwnBusiness();
  if (!business) throw new Error("no business");
  return business;
}

function revalidate(publicId: number) {
  revalidatePath("/business/edit");
  revalidatePath(`/b/${publicId}`);
}

// ─── יצירה ──────────────────────────────────────────────────

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+972|0)[\d\s-]{8,13}$/, "מספר טלפון לא תקין");

const createSchema = z.object({
  name: z.string().trim().min(2, "שם העסק קצר מדי").max(60, "שם העסק ארוך מדי"),
  category_id: z.string().refine(isUuid, "בחרו קטגוריה"),
  city: z.string().trim().min(2, "בחרו עיר").max(60),
  phone: phoneSchema,
});

export type CreateState = Result & { fields?: Record<string, string> };

export async function createBusiness(_: CreateState, formData: FormData): Promise<CreateState> {
  const profile = await requireUser();
  const fields = Object.fromEntries(
    ["name", "category_id", "city", "phone"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = createSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  if (profile.account_type !== "business_owner") {
    return { error: "רק חשבון של בעל/ת עסק יכול ליצור עמוד עסק.", fields };
  }
  if (await getOwnBusiness()) redirect("/business/edit");

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").insert({
    owner_id: profile.id,
    ...parsed.data,
    whatsapp: parsed.data.phone,
  });
  if (error) return { ...dbError(error), fields };
  redirect("/business/edit?welcome=1");
}

// ─── שמירה ──────────────────────────────────────────────────

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const saveSchema = z.object({
  name: z.string().trim().min(2, "שם העסק קצר מדי").max(60, "שם העסק ארוך מדי"),
  category_id: z.string().refine(isUuid),
  tagline: optionalText(80),
  bio: optionalText(1500),
  phone: phoneSchema.or(z.literal("")).transform((v) => v || null),
  whatsapp: phoneSchema.or(z.literal("")).transform((v) => v || null),
  email: z.email("מייל לא תקין").or(z.literal("")).transform((v) => v || null),
  website: optionalText(200),
  instagram: optionalText(60),
  facebook: optionalText(200),
  tiktok: optionalText(60),
  city: optionalText(60),
  address: optionalText(120),
  service_area: optionalText(120),
  years_experience: z.number().int().min(0).max(80).nullable(),
  animals_served: z.number().int().min(0).max(1_000_000).nullable(),
  languages: z.array(z.enum(LANGUAGES)).max(LANGUAGES.length),
  certifications: z.array(z.string().trim().min(1).max(80)).max(12, "עד 12 הסמכות"),
  hours: z.partialRecord(z.enum(["0", "1", "2", "3", "4", "5", "6"]), z.array(z.tuple([time, time])).max(3)),
  open_on_holidays: z.boolean(),
  price_list: z
    .array(
      z.object({
        title: z.string().trim().min(1, "לכל שירות במחירון צריך שם").max(60),
        price: z.string().trim().max(20),
        note: z.string().trim().max(120).optional(),
      }),
    )
    .max(40, "עד 40 שורות במחירון"),
  design: z.object({
    mode: z.enum(["default", "personal"]),
    accent: z.enum(Object.keys(ACCENTS) as [keyof typeof ACCENTS, ...(keyof typeof ACCENTS)[]]).optional(),
    layout: z.enum(["classic", "side"]).optional(),
    sections: z.array(z.object({ id: z.enum(SECTION_IDS), visible: z.boolean() })).max(SECTION_IDS.length).optional(),
  }),
  filter_values: z.record(
    z.string().refine(isUuid),
    z.object({ bool: z.boolean().optional(), options: z.array(z.string().max(40)).max(30).optional() }),
  ),
});

export type SaveInput = z.input<typeof saveSchema>;

export async function saveBusiness(input: SaveInput): Promise<Result> {
  const business = await ownBusinessOrThrow();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { filter_values, ...fields } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update(fields).eq("id", business.id);
  if (error) return dbError(error);

  // Filter values: replace wholesale (small set per business).
  const rows = Object.entries(filter_values)
    .map(([filter_id, v]) => ({
      business_id: business.id,
      filter_id,
      bool_value: v.bool ?? null,
      option_values: v.options ?? [],
    }))
    .filter((r) => r.bool_value === true || r.option_values.length > 0);
  const { error: delError } = await supabase.from("business_filter_values").delete().eq("business_id", business.id);
  if (delError) return dbError(delError);
  if (rows.length) {
    const { error: insError } = await supabase.from("business_filter_values").insert(rows);
    if (insError) return dbError(insError);
  }

  revalidate(business.public_id);
  return { ok: "השינויים נשמרו" };
}

// ─── תמונות ─────────────────────────────────────────────────
// The browser uploads to storage directly (RLS limits it to <business_id>/…);
// these actions record the path and clean up the replaced file.

function ownsPath(businessId: string, path: string) {
  return path.startsWith(`${businessId}/`) && !path.includes("..");
}

export async function setMedia(kind: "avatar" | "cover", path: string | null): Promise<Result> {
  const business = await ownBusinessOrThrow();
  if (path && !ownsPath(business.id, path)) return { error: "נתיב לא תקין" };
  const column = kind === "avatar" ? "avatar_path" : "cover_path";
  const previous = business[column];

  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ [column]: path }).eq("id", business.id);
  if (error) return dbError(error);
  if (previous && previous !== path) await supabase.storage.from(MEDIA_BUCKET).remove([previous]);

  revalidate(business.public_id);
  return { ok: kind === "avatar" ? "תמונת הפרופיל עודכנה" : "תמונת הרקע עודכנה" };
}

export async function addPhoto(path: string): Promise<Result & { id?: string }> {
  const business = await ownBusinessOrThrow();
  if (!ownsPath(business.id, path)) return { error: "נתיב לא תקין" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_photos")
    .insert({ business_id: business.id, path, sort_order: business.photos.length })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return dbError(error);
  }
  revalidate(business.public_id);
  return { ok: "התמונה נוספה", id: data.id };
}

export async function removePhoto(photoId: string): Promise<Result> {
  const business = await ownBusinessOrThrow();
  const photo = business.photos.find((p) => p.id === photoId);
  if (!photo) return { error: "התמונה לא נמצאה" };
  const supabase = await createClient();
  const { error } = await supabase.from("business_photos").delete().eq("id", photoId);
  if (error) return dbError(error);
  await supabase.storage.from(MEDIA_BUCKET).remove([photo.path]);
  revalidate(business.public_id);
  return { ok: "התמונה הוסרה" };
}

// ─── סטטוס ו-PRO ────────────────────────────────────────────

export async function submitForReview(): Promise<Result> {
  const business = await ownBusinessOrThrow();
  if (business.status !== "draft") return { error: "העמוד כבר נשלח." };
  if (!business.phone && !business.whatsapp) return { error: "צריך לפחות מספר טלפון או וואטסאפ לפני השליחה." };
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ status: "pending" }).eq("id", business.id);
  if (error) return dbError(error);
  revalidate(business.public_id);
  return { ok: "העמוד נשלח לאישור. נעדכן אותך כשהוא יעלה לאוויר." };
}

export async function withdrawSubmission(): Promise<Result> {
  const business = await ownBusinessOrThrow();
  if (business.status !== "pending") return { error: "העמוד לא ממתין לאישור." };
  const supabase = await createClient();
  const { error } = await supabase.from("businesses").update({ status: "draft" }).eq("id", business.id);
  if (error) return dbError(error);
  revalidate(business.public_id);
  return { ok: "השליחה בוטלה. אפשר להמשיך לערוך." };
}

export async function joinProWaitlist(): Promise<Result> {
  const business = await ownBusinessOrThrow();
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_pro_waitlist", { p_id: business.id });
  if (error) return dbError(error);
  revalidatePath("/business/edit");
  return { ok: "מעולה! נעדכן אותך ראשון כש-PRO יושק." };
}

// Live check while typing. The database trigger is the real gate.
export async function checkProfanity(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("find_profanity", { p_text: text.slice(0, 3000) });
  return Array.isArray(data) && data.length > 0;
}
