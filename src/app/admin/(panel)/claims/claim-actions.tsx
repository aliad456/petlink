"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, Label, Textarea } from "@/components/ui";
import { reviewClaim } from "../businesses/actions";

export function ClaimActions({ id, kind, name }: { id: string; kind: "claim" | "removal"; name: string }) {
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const r = await reviewClaim(id, dialog === "approve", note);
      if (r.error) return void toast.error(r.error);
      toast.success(r.ok!);
      setDialog(null);
    });

  const approveText =
    kind === "claim"
      ? "העמוד יעבור לניהול המבקש, והוא יוכל לערוך בו הכול. אשרו רק אחרי שאימתתם בטלפון המפורסם של העסק."
      : "העמוד יוסר מהאתר. אשרו רק אחרי שאימתתם שהמבקש מורשה לפעול בשם העסק.";

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setDialog("approve")}>
        <Check className="size-4" />
        {kind === "claim" ? "אימתתי — להעביר בעלות" : "אימתתי — להסיר"}
      </Button>
      <Button size="sm" variant="glass" onClick={() => setDialog("reject")}>
        <X className="size-4" />
        דחייה
      </Button>

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "approve" ? `אישור: ${name}` : `דחיית הבקשה: ${name}`}
        description={dialog === "approve" ? approveText : "המבקש לא יקבל שום הרשאה בעמוד."}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Label>
            {dialog === "approve" ? "איך אימתתם? (נשמר ביומן)" : "סיבה (לא חובה)"}
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required={dialog === "approve"}
              maxLength={500}
              className="min-h-20"
              placeholder={dialog === "approve" ? "למשל: שוחחתי עם בעל העסק במספר המפורסם" : undefined}
            />
          </Label>
          <div className="flex flex-row-reverse gap-2.5">
            <Button type="submit" variant={dialog === "approve" ? "primary" : "danger"} loading={pending} className="flex-1">
              {dialog === "approve" ? "אישור" : "דחייה"}
            </Button>
            <Button type="button" variant="glass" className="flex-1" onClick={() => setDialog(null)}>
              ביטול
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
