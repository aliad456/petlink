"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { ADS_TAG } from "@/lib/ads";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type AdResult = { ok?: string; error?: string; id?: string; reserved?: string };

function refresh() {
  revalidateTag(ADS_TAG, { expire: 0 });
  revalidatePath("/admin/banners", "layout");
}

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const campaignSchema = z.object({
  kind: z.enum(["ad", "adoption"]),
  placement: z.enum(["home", "category", "search", "popup"]),
  advertiser: z.string().trim().min(2, "שם המפרסם קצר מדי").max(80),
  contact_name: z.string().trim().max(80),
  contact_phone: z.string().trim().max(20),
  contact_email: z.string().trim().max(120),
  link_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || isHttpUrl(v), "קישור צריך להתחיל ב-https://"),
  alt_text: z.string().trim().min(2, "כתבו תיאור קצר של המודעה (לנגישות)").max(150),
  image_path: z.string().min(1, "חסרה תמונה"),
  mobile_image_path: z.string(),
  status: z.enum(["active", "paused"]),
  notes: z.string().trim().max(1000),
});

export type CampaignInput = z.input<typeof campaignSchema>;

export async function saveCampaign(
  id: string | null,
  input: CampaignInput,
  days: string[],
  price: number | null,
  force: boolean,
): Promise<AdResult> {
  await requireStaff();
  if (id && !isUuid(id)) return { error: "מזהה לא תקין" };
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const validDays = days.filter((d) => day.safeParse(d).success);
  if (!validDays.length) return { error: "בחרו לפחות יום אחד בלוח" };
  if (price != null && (!Number.isFinite(price) || price < 0)) return { error: "סכום לא תקין" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_save_ad_campaign", {
    p_id: id,
    p_data: parsed.data,
    p_days: validDays,
    p_price: price,
    p_force: force,
  });
  if (error) {
    if (error.hint === "reserved") return { reserved: error.details ?? "" };
    if (error.hint === "full") return { error: `המיקום מלא בימים: ${error.details}. בחרו ימים אחרים או מיקום אחר.` };
    if (error.code === "42501") return { error: "אין לך הרשאה לנהל מודעות." };
    return { error: "השמירה נכשלה. נסו שוב." };
  }
  refresh();
  return { ok: id ? "המודעה עודכנה" : "המודעה נוצרה", id: data as string };
}

export async function deleteCampaign(id: string): Promise<AdResult> {
  await requireStaff();
  if (!isUuid(id)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_ad_campaign", { p_id: id });
  if (error) return { error: error.code === "42501" ? "אין לך הרשאה." : "המחיקה נכשלה." };
  refresh();
  return { ok: "המודעה נמחקה" };
}

export async function setWeekdayRule(weekday: number, reserved: "adoption" | "ads" | null): Promise<AdResult> {
  await requireStaff();
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "יום לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_weekday_rule", { p_weekday: weekday, p_reserved: reserved });
  if (error) return { error: "השמירה נכשלה." };
  refresh();
  return { ok: "נשמר" };
}

export async function setDateRule(
  date: string,
  reserved: "adoption" | "ads" | "open" | null,
  label: string,
): Promise<AdResult> {
  await requireStaff();
  if (!day.safeParse(date).success) return { error: "תאריך לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_date_rule", {
    p_day: date,
    p_reserved: reserved,
    p_label: label.trim().slice(0, 60),
  });
  if (error) return { error: "השמירה נכשלה." };
  refresh();
  return { ok: reserved ? "התאריך נשמר" : "התאריך הוסר" };
}

export async function updatePlacement(key: string, capacity: number, active: boolean): Promise<AdResult> {
  await requireStaff();
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10) return { error: "מספר לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_placement", {
    p_key: key,
    p_capacity: capacity,
    p_active: active,
  });
  if (error) return { error: "השמירה נכשלה." };
  refresh();
  return { ok: "נשמר" };
}
