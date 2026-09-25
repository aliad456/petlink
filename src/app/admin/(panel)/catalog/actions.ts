"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// Every write goes through an admin_* SQL function, which checks
// catalog.manage and writes the audit log in the same transaction.

export type ActionResult = { ok?: string; error?: string };

function dbError(error: PostgrestError): ActionResult {
  if (error.code === "23505") return { error: "הכתובת הזו כבר בשימוש בקטגוריה אחרת." };
  if (error.code === "42501") return { error: "אין לך הרשאה לנהל קטגוריות ופילטרים." };
  if (error.code === "P0002") return { error: "הפריט לא נמצא. רעננו את העמוד." };
  if (error.message.includes("invalid slug")) return { error: "כתובת לא תקינה: אותיות באנגלית, ספרות ומקפים בלבד." };
  if (error.message.includes("invalid options")) return { error: "צריך לפחות אפשרות אחת, וכל אפשרות צריכה שם." };
  if (error.message.includes("every")) return { error: "הרשימה השתנתה בינתיים. רעננו את העמוד." };
  return { error: "השמירה נכשלה. נסו שוב." };
}

async function db() {
  await requirePermission("catalog.manage");
  return createClient();
}

function done(ok: string): ActionResult {
  // Staff expect to see their change on the site right away.
  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath("/admin/catalog");
  revalidatePath("/"); // the home page lists categories and featured filters
  return { ok };
}

const categorySchema = z.object({
  id: z.string().refine(isUuid).nullable(),
  name: z.string().trim().min(1, "חסר שם").max(60, "השם ארוך מדי"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "כתובת לא תקינה: אותיות באנגלית, ספרות ומקפים בלבד")
    .max(40, "הכתובת ארוכה מדי"),
  description: z.string().trim().max(300, "התיאור ארוך מדי"),
  icon: z.string().refine((v) => v in CATEGORY_ICONS, "אייקון לא מוכר"),
  is_visible: z.boolean(),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const c = parsed.data;

  const supabase = await db();
  const { error } = await supabase.rpc("admin_save_category", {
    p_id: c.id,
    p_slug: c.slug,
    p_name: c.name,
    p_description: c.description,
    p_icon: c.icon,
    p_is_visible: c.is_visible,
  });
  if (error) return dbError(error);
  return done(c.id ? "הקטגוריה נשמרה" : "הקטגוריה נוספה");
}

export async function setCategoryVisible(id: string, visible: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await db();
  const { error } = await supabase.rpc("admin_set_category_visible", { p_id: id, p_visible: visible });
  if (error) return dbError(error);
  return done(visible ? "הקטגוריה מוצגת באתר" : "הקטגוריה הוסתרה");
}

// One category (e.g. vets) powers the "emergency" button on the home page.
export async function setCategoryEmergency(id: string, value: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await db();
  const { error } = await supabase.rpc("admin_set_category_emergency", { p_id: id, p_value: value });
  if (error) return dbError(error);
  return done(value ? "הקטגוריה תופיע בכפתור החירום בדף הבית" : "הקטגוריה הוסרה מכפתור החירום");
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  if (!ids.every(isUuid)) return { error: "מזהה לא תקין" };
  const supabase = await db();
  const { error } = await supabase.rpc("admin_reorder_categories", { p_ids: ids });
  if (error) return dbError(error);
  return done("הסדר עודכן");
}

const filterSchema = z.object({
  id: z.string().refine(isUuid).nullable(),
  name: z.string().trim().min(1, "חסר שם").max(60, "השם ארוך מדי"),
  kind: z.enum(["boolean", "multi_select", "open_now", "distance"]),
  options: z
    .array(
      z.object({
        value: z.string().regex(/^[a-z0-9_]+$/),
        label: z.string().trim().min(1, "לכל אפשרות צריך שם").max(40, "שם האפשרות ארוך מדי"),
      }),
    )
    .max(30, "יותר מדי אפשרויות"),
  is_featured: z.boolean(),
  is_visible: z.boolean(),
  category_ids: z.array(z.string().refine(isUuid)),
});

export async function saveFilter(input: z.input<typeof filterSchema>): Promise<ActionResult> {
  const parsed = filterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const f = parsed.data;
  if (f.kind === "multi_select" && f.options.length === 0) {
    return { error: "צריך לפחות אפשרות אחת." };
  }

  const supabase = await db();
  const { error } = await supabase.rpc("admin_save_filter", {
    p_id: f.id,
    p_name: f.name,
    p_kind: f.kind,
    p_options: f.options,
    p_is_featured: f.is_featured,
    p_is_visible: f.is_visible,
    p_category_ids: f.category_ids,
  });
  if (error) return dbError(error);
  return done(f.id ? "הפילטר נשמר" : "הפילטר נוסף");
}

export async function setFilterVisible(id: string, visible: boolean): Promise<ActionResult> {
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await db();
  const { error } = await supabase.rpc("admin_set_filter_visible", { p_id: id, p_visible: visible });
  if (error) return dbError(error);
  return done(visible ? "הפילטר מוצג באתר" : "הפילטר הוסתר");
}

export async function reorderFilters(ids: string[]): Promise<ActionResult> {
  if (!ids.every(isUuid)) return { error: "מזהה לא תקין" };
  const supabase = await db();
  const { error } = await supabase.rpc("admin_reorder_filters", { p_ids: ids });
  if (error) return dbError(error);
  return done("הסדר עודכן");
}
