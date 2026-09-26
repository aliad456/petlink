"use client";

import { Check, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, Label, Textarea } from "@/components/ui";
import { DEFAULT_LOCK_HOURS } from "@/lib/admin/lock";
import { moderateReview } from "./actions";

export function ReviewModeration({
  id,
  status,
  hasReports,
  canLock,
}: {
  id: string;
  status: string;
  hasReports: boolean;
  canLock: boolean;
}) {
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const [lockAuthor, setLockAuthor] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (action: "keep" | "remove") =>
    startTransition(async () => {
      const r = await moderateReview(id, action, reason, action === "remove" && lockAuthor);
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok!);
      setRemoving(false);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {(hasReports || status !== "published") && (
        <Button size="sm" variant="glass" loading={pending && !removing} onClick={() => run("keep")}>
          <Check className="size-4" />
          {status === "removed" ? "להחזיר לאתר" : "תקינה — להשאיר"}
        </Button>
      )}
      {status !== "removed" && (
        <Button size="sm" variant="danger" onClick={() => setRemoving(true)}>
          <Trash2 className="size-4" />
          הסרה
        </Button>
      )}
      <Dialog
        open={removing}
        onClose={() => setRemoving(false)}
        title="הסרת הביקורת"
        description="הביקורת תוסר מהאתר, והכותב לא יוכל לפרסם אותה מחדש. הסיבה תוצג לכותב."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("remove");
          }}
        >
          <Label>
            סיבה
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={300}
              className="min-h-20"
              placeholder="למשל: השמצה, מידע אישי, לא לקוח אמיתי"
              autoFocus
            />
          </Label>
          {canLock && (
            <label className="glass-lite flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 text-sm">
              <input
                type="checkbox"
                checked={lockAuthor}
                onChange={(e) => setLockAuthor(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--danger)]"
              />
              <span>
                <b>נעילת הכותב ל-{DEFAULT_LOCK_HOURS} שעות</b>
                <span className="block text-muted">
                  להפרת תנאי הקהילה (קללות, השמצות, הטרדה). הכותב לא יוכל להתחבר ויראה את הסיבה שכתבתם, והנעילה משתחררת לבד.
                </span>
              </span>
            </label>
          )}
          <Button type="submit" variant="danger" loading={pending}>
            {lockAuthor ? "הסרה ונעילה" : "הסרה"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
