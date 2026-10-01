"use client";

import { CalendarCheck, Check, PawPrint } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, buttonClass, Card, cn, Input, Label, SectionTitle, Spinner, Textarea } from "@/components/ui";
import {
  dayLabel,
  dayNoon,
  durationLabel,
  shortDayLabel,
  timeLabel,
  upcomingDays,
  type BookingService,
  type BookingSettings,
} from "@/lib/bookings";
import { petMediaUrl, SPECIES, type Species } from "@/lib/pets";
import { bookAppointment, getSlots } from "./actions";

type MyPet = { id: string; name: string; species: Species; avatar_path: string | null };

const CHIP = "pressable focus-ring rounded-2xl px-4 py-3 text-sm font-semibold transition-colors";
const chipState = (on: boolean) =>
  on ? "bg-brand text-[var(--brand-foreground)] shadow-md" : "bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)]";

export function BookingWizard({
  business,
  settings,
  services,
  pets,
  needPhone,
}: {
  business: { id: string; publicId: number; name: string };
  settings: BookingSettings;
  services: BookingService[];
  pets: MyPet[];
  needPhone: boolean;
}) {
  const [service, setService] = useState<BookingService | null>(services.length === 1 ? services[0] : null);
  const days = upcomingDays(Math.min(settings.max_days_ahead + 1, 31));
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [pet, setPet] = useState<string | null>(pets.length === 1 ? pets[0].id : null);
  const [share, setShare] = useState(true);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyOk, setPolicyOk] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const policy = settings.cancel_policy?.trim();
  const petName = pets.find((p) => p.id === pet)?.name;

  const request = useRef(0);
  const loadSlots = (svc: BookingService | null, d: string | null) => {
    setTime(null);
    if (!svc || !d) return;
    const id = ++request.current;
    setLoadingSlots(true);
    getSlots(business.id, svc.id, d).then((s) => {
      if (id !== request.current) return; // a newer choice won
      setSlots(s);
      setLoadingSlots(false);
    });
  };

  const book = (accepted: boolean) =>
    service &&
    time &&
    start(async () => {
      const r = await bookAppointment({
        businessId: business.id,
        serviceId: service.id,
        startsAt: time,
        petId: pet,
        sharePet: share,
        note,
        policyOk: accepted,
        phone,
      });
      if (r.error) {
        toast.error(r.error);
        // Someone took the slot meanwhile: reload the day.
        loadSlots(service, day);
        setPolicyOpen(false);
        return;
      }
      setPolicyOpen(false);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  if (done && service && time) {
    return (
      <Card className="animate-rise flex flex-col items-center gap-4 p-8 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success">
          <CalendarCheck className="size-8" />
        </span>
        <p className="text-2xl font-extrabold">התור נקבע!</p>
        <p className="text-muted">
          {service.name} ב{business.name}
          <br />
          <span className="font-semibold text-foreground">
            {dayLabel(time)} בשעה {timeLabel(time)}
          </span>
          {petName && <> · עם {petName}</>}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/account#bookings" className={buttonClass({ size: "sm" })}>
            התורים שלי
          </Link>
          <Link href={`/b/${business.publicId}`} className={buttonClass({ variant: "glass", size: "sm" })}>
            חזרה לעמוד העסק
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-3">
        <SectionTitle>1. מה קובעים?</SectionTitle>
        <div className="flex flex-col gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={service?.id === s.id}
              onClick={() => {
                setService(s);
                loadSlots(s, day);
              }}
              className={cn(CHIP, "flex items-center gap-3 text-start", chipState(service?.id === s.id))}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold">{s.name}</span>
                <span className="block text-xs font-medium opacity-80">
                  {[durationLabel(s.duration_min), s.price, s.note].filter(Boolean).join(" · ")}
                </span>
              </span>
              {service?.id === s.id && <Check className="size-5 shrink-0" />}
            </button>
          ))}
        </div>
      </Card>

      {service && (
        <Card className="animate-rise flex flex-col gap-3">
          <SectionTitle>2. באיזה יום?</SectionTitle>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={day === d}
                onClick={() => {
                  setDay(d);
                  loadSlots(service, d);
                }}
                className={cn(CHIP, "shrink-0 whitespace-nowrap", chipState(day === d))}
              >
                {shortDayLabel(dayNoon(d))}
              </button>
            ))}
          </div>
          {day && (
            <>
              <SectionTitle>3. באיזו שעה?</SectionTitle>
              {loadingSlots ? (
                <Spinner className="size-5 self-center" />
              ) : !slots?.length ? (
                <p className="text-sm text-muted">אין שעות פנויות ביום הזה. נסו יום אחר.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" dir="ltr">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={time === s}
                      onClick={() => setTime(s)}
                      className={cn(CHIP, "px-2 tabular-nums", chipState(time === s))}
                    >
                      {timeLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {time && (
        <Card className="animate-rise flex flex-col gap-4">
          <SectionTitle>4. פרטים</SectionTitle>
          {pets.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">עם איזו חיה?</span>
              <div className="flex flex-wrap gap-2">
                {pets.map((p) => {
                  const avatar = petMediaUrl(p.avatar_path);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={pet === p.id}
                      onClick={() => setPet(pet === p.id ? null : p.id)}
                      className={cn(CHIP, "flex items-center gap-2 py-2 ps-2", chipState(pet === p.id))}
                    >
                      <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-[var(--glass-bg-strong)] text-lg">
                        {avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element -- owner's photo
                          <img src={avatar} alt="" className="size-full object-cover" />
                        ) : (
                          SPECIES[p.species].emoji
                        )}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
              {pet && (
                <label className="flex items-start gap-2.5 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 accent-[var(--brand)]" checked={share} onChange={(e) => setShare(e.target.checked)} />
                  <span>
                    לשתף עם העסק את הכרטיס של {petName}{" "}
                    <span className="text-muted">(תמונות, חיסונים והערות. אפשר לבטל מתי שרוצים)</span>
                  </span>
                </label>
              )}
            </div>
          )}
          {pets.length === 0 && (
            <p className="flex items-start gap-2 text-sm text-muted">
              <PawPrint className="mt-0.5 size-4 shrink-0" />
              <span>
                יש לכם כרטיס לחיה ב-Kami? אפשר לצרף אותו לתור.{" "}
                <Link href="/account/pets/new" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
                  פתיחת כרטיס
                </Link>
              </span>
            </p>
          )}
          {needPhone && (
            <Label>
              טלפון (העסק ייצור קשר אם צריך)
              <Input type="tel" dir="ltr" inputMode="tel" value={phone} placeholder="050-0000000" onChange={(e) => setPhone(e.target.value)} />
            </Label>
          )}
          <Label>
            הערה לעסק (לא חובה)
            <Textarea
              value={note}
              maxLength={300}
              className="min-h-20"
              placeholder="למשל: הוא קצת חושש ממכונת התספורת"
              onChange={(e) => setNote(e.target.value)}
            />
          </Label>
          <div className="rounded-2xl bg-[var(--glass-bg)] p-3 text-sm">
            <span className="font-bold">{service?.name}</span>
            <br />
            {dayLabel(time)} בשעה {timeLabel(time)}
            {petName && <> · עם {petName}</>}
          </div>
          <Button
            size="lg"
            loading={pending && !policyOpen}
            disabled={needPhone && !phone.trim()}
            onClick={() => (policy ? (setPolicyOk(false), setPolicyOpen(true)) : book(false))}
          >
            <CalendarCheck className="size-5" />
            קביעת התור
          </Button>
        </Card>
      )}

      <Dialog open={policyOpen} onClose={() => setPolicyOpen(false)} title="מדיניות ביטול" description={`של ${business.name}`}>
        <div className="flex flex-col gap-4">
          <p className="whitespace-pre-line rounded-2xl bg-[var(--glass-bg)] p-4 text-sm leading-relaxed">{policy}</p>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={policyOk} onChange={(e) => setPolicyOk(e.target.checked)} />
            קראתי ואני מסכים/ה
          </label>
          <Button disabled={!policyOk} loading={pending} onClick={() => book(true)}>
            אישור וקביעת התור
          </Button>
        </div>
      </Dialog>
    </>
  );
}
