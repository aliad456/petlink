"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Dialog } from "@/components/dialog";
import { Button, buttonClass } from "@/components/ui";
import type { LockNotice } from "../actions";

const untilFormat = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jerusalem",
});

function remaining(until: string) {
  const hours = Math.max(1, Math.ceil((Date.parse(until) - Date.now()) / 3_600_000));
  if (hours === 1) return "פחות משעה";
  if (hours < 72) return `כ-${hours} שעות`;
  return `כ-${Math.round(hours / 24)} ימים`;
}

// Shown when a locked / blocked account tries to sign in: until when, and the
// reason staff wrote in the panel (users are entitled to know why).
export function LockDialog({ lock, open, onClose }: { lock: LockNotice; open: boolean; onClose: () => void }) {
  const title =
    lock.status === "deleted" ? "החשבון הזה נמחק" : lock.status === "blocked" ? "חשבונך נחסם" : "חשבונך ננעל זמנית";

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <span className="inline-flex size-12 items-center justify-center self-center rounded-2xl bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger">
          <Lock className="size-6" />
        </span>

        {lock.status === "locked" && lock.until && (
          <p className="text-center leading-relaxed">
            חשבונך ננעל עד <b>{untilFormat.format(new Date(lock.until))}</b>
            <span className="text-muted"> (עוד {remaining(lock.until)})</span>.
            <br />
            בסוף הזמן אפשר יהיה להתחבר שוב כרגיל.
          </p>
        )}
        {lock.status === "locked" && !lock.until && (
          <p className="text-center leading-relaxed">חשבונך ננעל עד שהצוות ישחרר אותו.</p>
        )}
        {lock.status === "blocked" && (
          <p className="text-center leading-relaxed">לא ניתן להתחבר לחשבון הזה.</p>
        )}
        {lock.status === "deleted" && (
          <p className="text-center leading-relaxed">החשבון נמחק ולא ניתן להתחבר אליו.</p>
        )}

        {lock.reason && (
          <div className="glass-lite rounded-2xl p-4 text-center">
            <p className="text-sm text-muted">הסיבה:</p>
            <p className="mt-1 text-lg leading-snug font-bold italic">&quot;{lock.reason}&quot;</p>
          </div>
        )}

        <p className="text-center text-sm text-muted">
          חושבים שזו טעות? אפשר לפנות אלינו ונבדוק.
        </p>
        <div className="flex flex-row-reverse gap-2.5">
          <Link href="/contact?topic=account" className={buttonClass({ variant: "primary", className: "flex-1" })}>
            פנייה לצוות
          </Link>
          <Button type="button" variant="glass" onClick={onClose} className="flex-1">
            הבנתי
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
