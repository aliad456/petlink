"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { BUSINESSES_TAG } from "@/lib/catalog";
import { REPORT_REASONS, type ReportReason } from "@/lib/reviews/types";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";

// All review writes go through SQL functions (submit_review, report_review, …)
// that check who may do what; these actions validate shape and map errors.

export type ReviewResult = { ok?: string; error?: string };

function reviewError(error: PostgrestError): ReviewResult {
  switch (error.hint) {
    case "profanity":
      return { error: "נמצאה מילה לא מתאימה. נסו לנסח אחרת." };
    case "own_business":
      return { error: "אי אפשר לכתוב ביקורת על העסק של עצמך." };
    case "unclaimed":
      return { error: "אפשר לכתוב ביקורות רק אחרי שבעל העסק מצטרף ל-Kami." };
    case "removed":
      return { error: "הביקורת שלך הוסרה ע״י הצוות ואי אפשר לפרסם אותה מחדש." };
    case "rate_limited":
      return { error: "כתבת הרבה ביקורות היום. נסו שוב מחר." };
    case "body_length":
      return { error: "הביקורת צריכה להיות באורך 10 עד 1500 תווים." };
    case "own_review":
      return { error: "אי אפשר לדווח על ביקורת של עצמך." };
  }
  if (error.code === "23505") return { error: "כבר דיווחת על הביקורת הזו. תודה!" };
  if (error.code === "P0002") return { error: "הביקורת לא נמצאה." };
  if (error.code === "42501") return { error: "אין הרשאה לפעולה הזו." };
  return { error: "הפעולה נכשלה. נסו שוב." };
}

function revalidate(publicId: number) {
  revalidatePath(`/b/${publicId}`);
  revalidateTag(BUSINESSES_TAG, { expire: 0 }); // rating on result cards
}

const reviewSchema = z.object({
  rating: z.number().int().min(1, "בחרו דירוג").max(5),
  body: z.string().trim().min(10, "כתבו לפחות 10 תווים").max(1500, "עד 1500 תווים"),
});

export async function submitReview(
  businessId: string,
  publicId: number,
  input: { rating: number; body: string },
): Promise<ReviewResult> {
  await requireUser();
  if (!isUuid(businessId)) return { error: "מזהה לא תקין" };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_business: businessId,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body,
  });
  if (error) return reviewError(error);
  revalidate(publicId);
  return { ok: "הביקורת פורסמה. תודה!" };
}

export async function deleteMyReview(reviewId: string, publicId: number): Promise<ReviewResult> {
  await requireUser();
  if (!isUuid(reviewId)) return { error: "מזהה לא תקין" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_review", { p_review: reviewId });
  if (error) return reviewError(error);
  revalidate(publicId);
  return { ok: "הביקורת נמחקה" };
}

export async function replyToReview(reviewId: string, publicId: number, reply: string): Promise<ReviewResult> {
  await requireUser();
  if (!isUuid(reviewId)) return { error: "מזהה לא תקין" };
  if (reply.trim().length > 1000) return { error: "עד 1000 תווים" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", { p_review: reviewId, p_reply: reply });
  if (error) return reviewError(error);
  revalidate(publicId);
  return { ok: reply.trim() ? "התגובה פורסמה" : "התגובה נמחקה" };
}

export async function reportReview(reviewId: string, reason: ReportReason, note: string): Promise<ReviewResult> {
  await requireUser();
  if (!isUuid(reviewId) || !(reason in REPORT_REASONS)) return { error: "בחרו סיבה" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_review", {
    p_review: reviewId,
    p_reason: reason,
    p_note: note.trim().slice(0, 500),
  });
  if (error) return reviewError(error);
  return { ok: "הדיווח התקבל. הצוות יבדוק את הביקורת." };
}
