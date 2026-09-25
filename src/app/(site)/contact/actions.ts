"use server";

import { z } from "zod";
import { CONTACT_KINDS, type ContactKind } from "@/lib/contact";
import { createClient } from "@/lib/supabase/server";

export type ContactState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const schema = z.object({
  kind: z.enum(Object.keys(CONTACT_KINDS) as [ContactKind, ...ContactKind[]]),
  name: z.string().trim().min(2, "הזינו שם").max(80),
  email: z.email("מייל לא תקין").max(120),
  phone: z.string().trim().max(20).optional(),
  message: z.string().trim().min(5, "כתבו כמה מילים").max(3000, "ההודעה ארוכה מדי"),
  page_url: z.string().trim().max(300).optional(),
});

// Anyone can write to us, signed in or not. The database rate-limits by email.
export async function sendContact(_: ContactState, formData: FormData): Promise<ContactState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = { kind: raw.kind, name: raw.name, email: raw.email, phone: raw.phone, message: raw.message, page_url: raw.page_url };
  if (raw.website) return { ok: true }; // honeypot
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact_request", {
    p_kind: d.kind,
    p_name: d.name,
    p_email: d.email,
    p_phone: d.phone || null,
    p_message: d.message,
    p_page_url: d.page_url || null,
  });
  if (error) {
    return {
      error: error.hint === "rate_limited" ? "שלחת כמה פניות בזמן קצר. נסו שוב בעוד שעה." : "השליחה נכשלה. נסו שוב.",
      fields,
    };
  }
  return { ok: true };
}
