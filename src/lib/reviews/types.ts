export type Review = {
  id: string;
  user_id: string;
  author_name: string;
  rating: number;
  body: string;
  status: "published" | "hidden" | "removed";
  status_reason: string | null;
  reply: string | null;
  reply_at: string | null;
  edited_at: string | null;
  created_at: string;
};

export const REVIEW_COLUMNS =
  "id, user_id, author_name, rating, body, status, status_reason, reply, reply_at, edited_at, created_at";

export const REPORT_REASONS = {
  offensive: "פוגענית או משמיצה",
  fake: "מזויפת / לא לקוח אמיתי",
  spam: "ספאם או פרסומת",
  privacy: "חושפת מידע אישי",
  irrelevant: "לא קשורה לעסק",
  other: "אחר",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export function reviewsLabel(n: number) {
  return n === 1 ? "ביקורת אחת" : `${n} ביקורות`;
}
