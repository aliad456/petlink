"use client";

import { CalendarClock, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelMyBooking } from "@/app/(site)/b/[publicId]/book/actions";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Badge, Button, Card, cn, SectionTitle } from "@/components/ui";
import { relativeDayLabel, shortDayLabel, STATUS_LABEL, timeLabel, type BookingStatus } from "@/lib/bookings";

export type MyBooking = {
  id: string;
  starts_at: string;
  status: BookingStatus;
  service_name: string;
  pet_name: string | null;
  cancel_reason: string | null;
  business: { name: string; public_id: number; address: string | null; city: string | null } | null;
};

// "התורים שלי": upcoming appointments, with cancel.
export function MyBookings({ bookings }: { bookings: MyBooking[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<MyBooking | null>(null);

  const cancel = (b: MyBooking) =>
    start(async () => {
      const r = await cancelMyBooking(b.id);
      if (r.error) return void toast.error(r.error);
      toast.success("התור בוטל");
      setConfirm(null);
      router.refresh();
    });

  return (
    <Card id="bookings" className="flex scroll-mt-24 flex-col gap-4">
      <SectionTitle>התורים שלי</SectionTitle>
      <ul className="flex flex-col gap-2">
        {bookings.map((b) => {
          const active = b.status === "booked";
          return (
            <li key={b.id} className={cn("flex items-center gap-3 rounded-2xl bg-[var(--glass-bg)] p-3", !active && "opacity-60")}>
              <span className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-[var(--glass-bg-strong)] py-1.5 text-center">
                <span className="text-[11px] font-medium text-muted">{shortDayLabel(b.starts_at)}</span>
                <span className="font-extrabold tabular-nums" dir="ltr">
                  {timeLabel(b.starts_at)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                {b.business ? (
                  <Link href={`/b/${b.business.public_id}`} className="block truncate font-bold hover:underline">
                    {b.business.name}
                  </Link>
                ) : (
                  <span className="block font-bold">עסק שהוסר</span>
                )}
                <span className="block truncate text-sm text-muted">
                  {[b.service_name, b.pet_name && `עם ${b.pet_name}`].filter(Boolean).join(" · ")}
                </span>
                <span className="block truncate text-xs text-muted">{relativeDayLabel(b.starts_at)}</span>
                {!active && (
                  <Badge tone="danger" className="mt-1">
                    {STATUS_LABEL[b.status]}
                    {b.cancel_reason ? `: ${b.cancel_reason}` : ""}
                  </Badge>
                )}
              </span>
              {active && (
                <span className="flex shrink-0 flex-col gap-1">
                  {b.business && (b.business.address || b.business.city) && (
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent([b.business.address, b.business.city].filter(Boolean).join(", "))}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="ניווט"
                      className="pressable focus-ring glass inline-flex size-9 items-center justify-center rounded-full"
                    >
                      <MapPin className="size-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    aria-label="ביטול התור"
                    onClick={() => setConfirm(b)}
                    className="pressable focus-ring glass inline-flex size-9 items-center justify-center rounded-full text-danger"
                  >
                    <X className="size-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-2 text-xs text-muted">
        <CalendarClock className="size-3.5" />
        ביטול כאן משחרר את השעה לאחרים. כדאי לבדוק את מדיניות הביטול של העסק.
      </p>

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="לבטל את התור?"
        description={confirm ? `${confirm.service_name} ב${confirm.business?.name ?? "עסק"}, ${relativeDayLabel(confirm.starts_at)} ב-${timeLabel(confirm.starts_at)}.` : undefined}
      >
        <Button variant="danger" loading={pending} onClick={() => confirm && cancel(confirm)}>
          כן, לבטל
        </Button>
      </Dialog>
    </Card>
  );
}
