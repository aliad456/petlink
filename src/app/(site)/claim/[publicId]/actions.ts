"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

export type ClaimState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const schema = z.object({
  business_id: z.string().refine(isUuid),
  kind: z.enum(["claim", "removal"]),
  full_name: z.string().trim().min(2, "הזינו שם מלא").max(80),
  role: z.string().trim().min(2, "כתבו מה התפקיד שלך בעסק").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^(\+972|0)[\d\s-]{8,13}$/, "מספר טלפון לא תקין"),
  message: z.string().trim().max(1000).optional(),
  declaration: z.literal("on", { error: "צריך לאשר את ההצהרה" }),
});

// Only records the request. Nothing changes on the business until staff
// verify it (request_business_claim / admin_review_claim in the database).
export async function requestClaim(_: ClaimState, formData: FormData): Promise<ClaimState> {
  await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = { kind: raw.kind, full_name: raw.full_name, role: raw.role, phone: raw.phone, message: raw.message };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_business_claim", {
    p_business: d.business_id,
    p_kind: d.kind,
    p_full_name: d.full_name,
    p_role: d.role,
    p_phone: d.phone,
    p_message: d.message || null,
    p_declaration: true,
  });
  if (error) {
    const msg =
      error.hint === "account_type"
        ? "כדי לנהל עמוד עסק צריך חשבון של בעל/ת עסק. אפשר לבקש הסרה גם מהחשבון הזה."
        : error.hint === "has_business"
          ? "כבר יש לך עמוד עסק בחשבון הזה. לעסק נוסף פנו אלינו דרך עמוד צור קשר."
          : error.hint === "profanity"
            ? "נמצאה מילה לא מתאימה באחד השדות."
            : error.code === "23505"
              ? "כבר שלחת בקשה כזו, והיא בבדיקה."
              : error.code === "P0002"
                ? "העמוד כבר מנוהל או שאינו זמין."
                : "השליחה נכשלה. נסו שוב.";
    return { error: msg, fields };
  }
  return { ok: true };
}
