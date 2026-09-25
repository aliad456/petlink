"use client";

import { Flag, MessageSquareReply, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type CSSProperties } from "react";
import {
  deleteMyReview,
  replyToReview,
  reportReview,
  submitReview,
  type ReviewResult,
} from "@/app/(site)/b/[publicId]/review-actions";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Avatar, Button, buttonClass, cn, FormMessage, Label, Textarea } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import { REPORT_REASONS, reviewsLabel, type Review, type ReportReason } from "@/lib/reviews/types";
import { Stars } from "./stars";

// Sent to the browser without user_id: `mine` is worked out on the server.
export type PublicReview = Omit<Review, "user_id"> & { mine: boolean };

export type Viewer =
  | { kind: "anon" }
  | { kind: "owner" } // the business owner: replies, doesn't review
  | { kind: "user" };

export function ReviewsPanel({
  businessId,
  publicId,
  businessName,
  unclaimed,
  reviews,
  myReview,
  viewer,
}: {
  businessId: string;
  publicId: number;
  businessName: string;
  unclaimed: boolean;
  reviews: PublicReview[];
  myReview: PublicReview | null;
  viewer: Viewer;
}) {
  const [writing, setWriting] = useState(false);
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const loginHref = `/login?next=/b/${publicId}`;

  return (
    <div className="flex flex-col gap-5">
      {/* סיכום */}
      <div className="flex flex-col gap-5 rounded-3xl bg-[color-mix(in_oklab,var(--accent-from)_8%,transparent)] p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-1 sm:px-4">
          <span className="text-5xl font-extrabold tabular-nums tracking-tight">{count ? avg.toFixed(1) : "–"}</span>
          <div className="flex flex-col gap-1 sm:items-center">
            <Stars value={avg} className="text-lg" />
            <span className="text-sm text-muted">{count ? reviewsLabel(count) : "עוד אין ביקורות"}</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-1.5" aria-label="התפלגות הדירוגים">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = reviews.filter((r) => r.rating === n).length;
            return (
              <li key={n} className="flex items-center gap-2.5 text-xs text-muted">
                <span className="w-3 tabular-nums">{n}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--muted)_18%,transparent)]">
                  <span
                    className="block h-full origin-right rounded-full bg-amber-400 transition-transform duration-700 ease-out-soft"
                    style={{ transform: `scaleX(${count ? c / count : 0})` }}
                  />
                </span>
                <span className="w-5 text-end tabular-nums">{c}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* כתיבה */}
      {unclaimed ? (
        <p className="rounded-2xl bg-[var(--glass-bg)] px-4 py-3 text-sm text-muted">
          אפשר יהיה לכתוב ביקורות אחרי שבעל העסק יצטרף ל-Kami וינהל את העמוד.
        </p>
      ) : viewer.kind === "anon" ? (
        <Link href={loginHref} className={buttonClass({ className: "self-start" })}>
          <Star className="size-4" />
          כתיבת ביקורת
        </Link>
      ) : viewer.kind === "user" ? (
        myReview?.status === "removed" ? (
          <FormMessage error={`הביקורת שלך הוסרה ע״י הצוות${myReview.status_reason ? `: ${myReview.status_reason}` : "."}`} />
        ) : (
          <div className="flex flex-col gap-2">
            {myReview?.status === "hidden" && (
              <FormMessage message="הביקורת שלך מוסתרת זמנית, עד שהצוות יבדוק דיווחים עליה." />
            )}
            <Button className="self-start" variant={myReview ? "glass" : "primary"} onClick={() => setWriting(true)}>
              {myReview ? <Pencil className="size-4" /> : <Star className="size-4" />}
              {myReview ? "עריכת הביקורת שלי" : "כתיבת ביקורת"}
            </Button>
          </div>
        )
      ) : null}

      {/* רשימה */}
      {count === 0 ? (
        !unclaimed && <p className="py-6 text-center text-muted">עוד אין ביקורות. אולי תהיו הראשונים?</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r, i) => (
            <ReviewItem
              key={r.id}
              review={r}
              index={i}
              publicId={publicId}
              businessName={businessName}
              viewer={viewer}
              loginHref={loginHref}
              onEdit={() => setWriting(true)}
            />
          ))}
        </ul>
      )}

      {viewer.kind === "user" && (
        <ReviewDialog
          open={writing}
          onClose={() => setWriting(false)}
          businessId={businessId}
          publicId={publicId}
          businessName={businessName}
          existing={myReview}
        />
      )}
    </div>
  );
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const run = (job: () => Promise<ReviewResult>, after?: () => void) =>
    startTransition(async () => {
      const r = await job();
      if (r.error) return void toast.error(r.error);
      if (r.ok) toast.success(r.ok);
      after?.();
    });
  return [pending, run] as const;
}

function ReviewItem({
  review: r,
  index,
  publicId,
  businessName,
  viewer,
  loginHref,
  onEdit,
}: {
  review: PublicReview;
  index: number;
  publicId: number;
  businessName: string;
  viewer: Viewer;
  loginHref: string;
  onEdit: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(r.reply ?? "");
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, run] = useAction();

  const iconButton =
    "pressable focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-[var(--glass-bg)] hover:text-foreground";

  return (
    <li className="animate-rise flex flex-col gap-3 rounded-3xl border border-[var(--border)] p-4" style={{ "--i": Math.min(index, 8) } as CSSProperties}>
      <div className="flex items-start gap-3">
        <Avatar name={r.author_name} seed={r.id} className="size-10 text-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">
            {r.author_name}
            {r.mine && <span className="ms-1.5 text-xs font-medium text-muted">(את/ה)</span>}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <Stars value={r.rating} className="text-sm" />
            {formatRelative(r.created_at)}
            {r.edited_at && <span>· נערכה</span>}
          </span>
        </div>
      </div>

      <p className="whitespace-pre-line text-[15px] leading-relaxed">{r.body}</p>

      {r.reply && !replying && (
        <div className="rounded-2xl border-s-4 border-[var(--accent-from)] bg-[color-mix(in_oklab,var(--accent-from)_8%,transparent)] px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-muted">תגובת {businessName}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{r.reply}</p>
        </div>
      )}

      {replying && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => replyToReview(r.id, publicId, reply), () => setReplying(false));
          }}
        >
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={1000}
            className="min-h-20"
            placeholder="תגובה פומבית ומכבדת. אפשר להשאיר ריק כדי למחוק את התגובה."
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={pending}>
              פרסום התגובה
            </Button>
            <Button type="button" size="sm" variant="glass" onClick={() => setReplying(false)}>
              ביטול
            </Button>
          </div>
        </form>
      )}

      <div className="-ms-2 flex flex-wrap items-center gap-1">
        {viewer.kind === "owner" && !replying && (
          <button type="button" className={iconButton} onClick={() => setReplying(true)}>
            <MessageSquareReply className="size-3.5" />
            {r.reply ? "עריכת התגובה" : "תגובה"}
          </button>
        )}
        {r.mine ? (
          <>
            <button type="button" className={iconButton} onClick={onEdit}>
              <Pencil className="size-3.5" />
              עריכה
            </button>
            <button type="button" className={iconButton} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" />
              מחיקה
            </button>
          </>
        ) : viewer.kind === "anon" ? (
          <Link href={loginHref} className={iconButton}>
            <Flag className="size-3.5" />
            דיווח
          </Link>
        ) : (
          <button type="button" className={iconButton} onClick={() => setReporting(true)}>
            <Flag className="size-3.5" />
            דיווח
          </button>
        )}
      </div>

      <ReportDialog open={reporting} onClose={() => setReporting(false)} reviewId={r.id} />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="למחוק את הביקורת?"
        description="אפשר לכתוב ביקורת חדשה בכל זמן."
      >
        <div className="flex flex-row-reverse gap-2.5">
          <Button
            variant="danger"
            className="flex-1"
            loading={pending}
            onClick={() => run(() => deleteMyReview(r.id, publicId), () => setConfirmDelete(false))}
          >
            מחיקה
          </Button>
          <Button variant="glass" className="flex-1" onClick={() => setConfirmDelete(false)}>
            ביטול
          </Button>
        </div>
      </Dialog>
    </li>
  );
}

function ReviewDialog({
  open,
  onClose,
  businessId,
  publicId,
  businessName,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  publicId: number;
  businessName: string;
  existing: PublicReview | null;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(existing?.body ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const LABELS = ["", "גרוע", "לא משהו", "בסדר", "טוב מאוד", "מעולה"];
  const shown = hover || rating;

  return (
    <Dialog open={open} onClose={onClose} title={existing ? "עריכת הביקורת" : `ביקורת על ${businessName}`}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          startTransition(async () => {
            const r = await submitReview(businessId, publicId, { rating, body });
            if (r.error) return setError(r.error);
            toast.success(r.ok!);
            onClose();
          });
        }}
      >
        <fieldset className="flex flex-col items-center gap-2">
          <legend className="sr-only">דירוג</legend>
          <div className="flex gap-1" dir="ltr" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} כוכבים`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className="pressable focus-ring rounded-lg p-1"
              >
                <Star
                  className={cn(
                    "size-9 transition-colors",
                    n <= shown ? "fill-amber-400 text-amber-400" : "text-[color-mix(in_oklab,var(--muted)_45%,transparent)]",
                  )}
                />
              </button>
            ))}
          </div>
          <span className="h-5 text-sm font-medium text-muted">{LABELS[shown]}</span>
        </fieldset>
        <Label>
          איך היה?
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={10}
            maxLength={1500}
            required
            placeholder="ספרו על השירות, היחס והמחיר. ביקורת עניינית עוזרת לכולם."
          />
          <span className="text-xs text-muted">{body.trim().length}/1500</span>
        </Label>
        <p className="text-xs leading-relaxed text-muted">
          הביקורת תפורסם מיד עם השם הפרטי ואות ראשונה של שם המשפחה. כתבו רק על חוויה אמיתית שלכם, בלי פרטים אישיים
          ובלי השמצות. ביקורות שמפרות את <Link href="/terms" target="_blank" className="underline">תנאי השימוש</Link> יוסרו.
        </p>
        <FormMessage error={error} />
        <Button type="submit" size="lg" loading={pending} disabled={!rating}>
          {existing ? "שמירה" : "פרסום"}
        </Button>
      </form>
    </Dialog>
  );
}

function ReportDialog({ open, onClose, reviewId }: { open: boolean; onClose: () => void; reviewId: string }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [pending, run] = useAction();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="דיווח על ביקורת"
      description="הצוות יבדוק את הביקורת. ביקורת שמפרה את התנאים תוסר."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) run(() => reportReview(reviewId, reason, note), onClose);
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">מה הבעיה?</legend>
          {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm has-[:checked]:bg-[color-mix(in_oklab,var(--brand)_12%,transparent)] has-[:checked]:font-semibold"
            >
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-4 accent-[var(--brand)]"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <Label>
          פרטים נוספים (לא חובה)
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-20" />
        </Label>
        <Button type="submit" loading={pending} disabled={!reason}>
          שליחת הדיווח
        </Button>
      </form>
    </Dialog>
  );
}
