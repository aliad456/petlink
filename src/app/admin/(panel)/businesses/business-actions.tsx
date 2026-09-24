"use client";

import { Ban, Check, ExternalLink, Star, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, buttonClass, cn, FormMessage, Label, Textarea } from "@/components/ui";
import type { BusinessStatus } from "@/lib/business/types";
import { setBusinessFeatured, setBusinessStatus, type Result } from "./actions";

type Reasoned = "suspended" | "draft" | "removed";

const REASON_DIALOG: Record<Reasoned, { title: string; text: string; confirm: string }> = {
  suspended: { title: "השהיית העסק", text: "העמוד יוסתר מהאתר, ובעל העסק לא יוכל לערוך עד שתחזירו אותו.", confirm: "השהיה" },
  draft: { title: "החזרה לעריכה", text: "העמוד יחזור לטיוטה. כתבו לבעל העסק מה לתקן.", confirm: "החזרה לעריכה" },
  removed: { title: "הסרת העסק", text: "העמוד יוסר מהאתר. הנתונים נשמרים.", confirm: "הסרה" },
};

export function BusinessActions({
  business,
  can,
}: {
  business: { id: string; publicId: number; name: string; status: BusinessStatus; featured: boolean };
  can: { approve: boolean; remove: boolean; feature: boolean };
}) {
  const [dialog, setDialog] = useState<Reasoned | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const run = (job: () => Promise<Result>, after?: () => void) =>
    startTransition(async () => {
      const r = await job();
      if (r.error) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      if (r.ok) toast.success(r.ok);
      after?.();
    });

  const s = business.status;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/b/${business.publicId}`} target="_blank" className={buttonClass({ variant: "glass", size: "sm" })}>
        <ExternalLink className="size-4" />
        צפייה
      </Link>
      {can.approve && s !== "approved" && s !== "removed" && (
        <Button size="sm" loading={pending && !dialog} onClick={() => run(() => setBusinessStatus(business.id, "approved"))}>
          <Check className="size-4" />
          אישור
        </Button>
      )}
      {can.approve && s === "pending" && (
        <Button size="sm" variant="glass" onClick={() => setDialog("draft")}>
          <Undo2 className="size-4" />
          להחזיר לעריכה
        </Button>
      )}
      {can.approve && s === "approved" && (
        <Button size="sm" variant="danger" onClick={() => setDialog("suspended")}>
          <Ban className="size-4" />
          השהיה
        </Button>
      )}
      {can.feature && s === "approved" && (
        <button
          type="button"
          aria-pressed={business.featured}
          aria-label={business.featured ? "הסרה מהמומלצים" : "סימון כמומלץ"}
          title={business.featured ? "הסרה מהמומלצים" : "סימון כמומלץ"}
          onClick={() => run(() => setBusinessFeatured(business.id, !business.featured))}
          className={cn(
            "pressable focus-ring inline-flex size-9 items-center justify-center rounded-full",
            business.featured ? "bg-amber-400/20 text-amber-500" : "glass text-muted hover:text-amber-500",
          )}
        >
          <Star className={cn("size-4", business.featured && "fill-current")} />
        </button>
      )}
      {can.remove && s !== "removed" && (
        <button
          type="button"
          aria-label="הסרת העסק"
          title="הסרת העסק"
          onClick={() => setDialog("removed")}
          className="pressable focus-ring inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      )}

      <Dialog
        open={dialog !== null}
        onClose={() => {
          setDialog(null);
          setReason("");
          setError(undefined);
        }}
        title={dialog ? `${REASON_DIALOG[dialog].title}: ${business.name}` : ""}
        description={dialog ? REASON_DIALOG[dialog].text : undefined}
      >
        {dialog && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => setBusinessStatus(business.id, dialog, reason), () => {
                setDialog(null);
                setReason("");
              });
            }}
          >
            <Label>
              סיבה (תוצג לבעל העסק)
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} className="min-h-20" autoFocus />
            </Label>
            <FormMessage error={error} />
            <div className="flex flex-row-reverse gap-2.5">
              <Button type="submit" variant={dialog === "draft" ? "primary" : "danger"} loading={pending} className="flex-1">
                {REASON_DIALOG[dialog].confirm}
              </Button>
              <Button type="button" variant="glass" className="flex-1" onClick={() => setDialog(null)}>
                ביטול
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
