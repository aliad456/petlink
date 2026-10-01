"use client";

import { CalendarClock, MessageCircle, PawPrint, Phone, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Badge, Button, cn, Input, Label } from "@/components/ui";
import {
  isoToIsraelLocal,
  STATUS_LABEL,
  timeLabel,
  dayLabel,
  waLink,
  type BookingStatus,
} from "@/lib/bookings";
import { petAge, petMediaUrl, SPECIES, type Species } from "@/lib/pets";
import { cancelBookingAsBusiness, moveBooking } from "./actions";

export type BusinessBooking = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  service_name: string;
  note: string | null;
  cancel_reason: string | null;
  seen_at: string | null;
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  pet_id: string | null;
  pet_name: string | null;
  pet_species: Species | null;
  pet_breed: string | null;
  pet_sex: "male" | "female" | "unknown" | null;
  pet_birth_date: string | null;
  pet_avatar: string | null;
  pet_shared: boolean;
};

export function BookingCard({ booking: b, past = false }: { booking: BusinessBooking; past?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<"cancel" | "move" | null>(null);
  const [reason, setReason] = useState("");
  const [when, setWhen] = useState(() => isoToIsraelLocal(b.starts_at));
  const active = b.status === "booked";
  const avatar = petMediaUrl(b.pet_avatar);
  const species = b.pet_species && SPECIES[b.pet_species] ? SPECIES[b.pet_species] : null;
  const age = b.pet_birth_date
    ? petAge({ birth_date: b.pet_birth_date, birth_date_estimated: false, sex: b.pet_sex ?? "unknown" })
    : null;

  const run = (fn: () => Promise<{ error?: string }>, done: string) =>
    start(async () => {
      const r = await fn();
      if (r.error) return void toast.error(r.error);
      toast.success(done);
      setDialog(null);
      router.refresh();
    });

  return (
    <li className={cn("glass-lite flex flex-col gap-3 rounded-[1.5rem] p-4", !active && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-[var(--glass-bg-strong)] py-2 tabular-nums" dir="ltr">
          <span className="text-lg font-extrabold leading-tight">{timeLabel(b.starts_at)}</span>
          <span className="text-xs text-muted">{timeLabel(b.ends_at)}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{b.service_name}</span>
            {!b.seen_at && active && <Badge tone="brand">חדש</Badge>}
            {!active && <Badge tone="danger">{STATUS_LABEL[b.status]}</Badge>}
          </div>
          {past && <span className="text-xs text-muted">{dayLabel(b.starts_at)}</span>}
          <span className="text-sm">{b.customer_name}</span>
          {b.cancel_reason && <span className="text-sm text-muted">סיבה: {b.cancel_reason}</span>}
        </div>
        {b.customer_phone && (
          <span className="flex shrink-0 gap-1.5">
            <a
              href={`tel:${b.customer_phone}`}
              aria-label={`התקשרות ל${b.customer_name}`}
              className="pressable focus-ring glass inline-flex size-10 items-center justify-center rounded-full"
            >
              <Phone className="size-4" />
            </a>
            <a
              href={waLink(b.customer_phone)}
              target="_blank"
              rel="noreferrer"
              aria-label={`וואטסאפ ל${b.customer_name}`}
              className="pressable focus-ring glass inline-flex size-10 items-center justify-center rounded-full"
            >
              <MessageCircle className="size-4 text-[#128c7e] dark:text-[#25d366]" />
            </a>
          </span>
        )}
      </div>

      {b.pet_name && (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--glass-bg)] p-2.5">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--glass-bg-strong)] text-2xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- owner's photo
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              (species?.emoji ?? <PawPrint className="size-5" />)
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{b.pet_name}</span>
            <span className="block truncate text-xs text-muted">
              {[b.pet_breed || species?.label, age].filter(Boolean).join(" · ")}
            </span>
          </span>
          {b.pet_shared && b.pet_id && (
            <Link
              href={`/business/pets/${b.pet_id}`}
              transitionTypes={["nav-forward"]}
              className="focus-ring shrink-0 rounded-lg text-sm font-semibold text-brand-strong underline underline-offset-2 dark:text-brand"
            >
              לכרטיס
            </Link>
          )}
        </div>
      )}

      {b.note && <p className="rounded-2xl bg-[var(--glass-bg)] px-3 py-2 text-sm">״{b.note}״</p>}

      {active && !past && (
        <div className="flex gap-2">
          <Button size="sm" variant="glass" onClick={() => setDialog("move")}>
            <CalendarClock className="size-4" />
            הזזה
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDialog("cancel")}>
            <X className="size-4" />
            ביטול
          </Button>
        </div>
      )}

      <Dialog
        open={dialog === "cancel"}
        onClose={() => setDialog(null)}
        title="לבטל את התור?"
        description={`${b.service_name} של ${b.customer_name}, ${dayLabel(b.starts_at)} ב-${timeLabel(b.starts_at)}. כדאי להודיע ללקוח.`}
      >
        <div className="flex flex-col gap-4">
          <Label>
            סיבה (הלקוח יראה אותה)
            <Input value={reason} maxLength={200} placeholder="למשל: מחלה, אפשר לקבוע מחדש" onChange={(e) => setReason(e.target.value)} />
          </Label>
          <Button variant="danger" loading={pending} onClick={() => run(() => cancelBookingAsBusiness(b.id, reason), "התור בוטל")}>
            ביטול התור
          </Button>
        </div>
      </Dialog>

      <Dialog open={dialog === "move"} onClose={() => setDialog(null)} title="הזזת התור" description="בחרו יום ושעה חדשים. כדאי לתאם קודם עם הלקוח.">
        <div className="flex flex-col gap-4">
          <Label>
            יום ושעה
            <Input type="datetime-local" dir="ltr" value={when} step={300} onChange={(e) => setWhen(e.target.value)} />
          </Label>
          <Button loading={pending} onClick={() => run(() => moveBooking(b.id, when), "התור הוזז")}>
            שמירה
          </Button>
        </div>
      </Dialog>
    </li>
  );
}
