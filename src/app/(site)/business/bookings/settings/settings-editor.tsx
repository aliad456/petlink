"use client";

import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, Card, cn, Input, Label, SectionTitle, Switch, Textarea } from "@/components/ui";
import {
  DAYS_AHEAD,
  durationLabel,
  NOTICE_OPTIONS,
  SLOT_STEPS,
  type BookingService,
  type BookingSettings,
} from "@/lib/bookings";
import { deleteService, saveBookingSettings, saveService } from "../actions";

const DURATIONS = [10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 360, 480];
const SELECT =
  "focus-ring h-12 w-full rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 text-[15px] text-foreground";

type Draft = { id?: string; name: string; duration_min: number; price: string; note: string; active: boolean };
const EMPTY: Draft = { name: "", duration_min: 60, price: "", note: "", active: true };

export function SettingsEditor({
  pro,
  hasHours,
  settings,
  services,
}: {
  pro: boolean;
  hasHours: boolean;
  settings: BookingSettings;
  services: BookingService[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [s, setS] = useState(settings);
  const [draft, setDraft] = useState<Draft | null>(null);
  const activeServices = services.filter((x) => x.active).length;

  const save = (next: BookingSettings) =>
    start(async () => {
      const r = await saveBookingSettings({
        enabled: next.enabled,
        slot_step_min: next.slot_step_min,
        min_notice_min: next.min_notice_min,
        max_days_ahead: next.max_days_ahead,
        cancel_policy: next.cancel_policy ?? "",
      });
      if (r.error) {
        toast.error(r.error);
        setS(settings);
        return;
      }
      toast.success("נשמר");
      router.refresh();
    });

  const submitService = () =>
    draft &&
    start(async () => {
      const r = await saveService(draft);
      if (r.error) return void toast.error(r.error);
      toast.success(draft.id ? "השירות עודכן" : "השירות נוסף");
      setDraft(null);
      router.refresh();
    });

  const remove = (svc: BookingService) =>
    start(async () => {
      const r = await deleteService(svc.id);
      if (r.error) return void toast.error(r.error);
      toast.success("השירות נמחק");
      router.refresh();
    });

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">קבלת תורים אונליין</span>
            <span className="text-sm text-muted">
              {s.enabled ? "פעיל: בעמוד העסק מופיע כפתור ״קביעת תור״." : "כבוי: הכפתור לא מופיע בעמוד העסק."}
            </span>
          </div>
          <Switch
            checked={s.enabled}
            disabled={!pro || pending || (!s.enabled && (activeServices === 0 || !hasHours))}
            label="קבלת תורים אונליין"
            onChange={(v) => {
              const next = { ...s, enabled: v };
              setS(next);
              save(next);
            }}
          />
        </div>
        {pro && !s.enabled && (activeServices === 0 || !hasHours) && (
          <p className="rounded-2xl bg-[color-mix(in_oklab,var(--warning)_12%,transparent)] px-3 py-2 text-sm">
            {activeServices === 0 ? "כדי להפעיל, הוסיפו לפחות שירות אחד." : "כדי להפעיל, הגדירו שעות פעילות בעריכת העסק."}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>שירותים</SectionTitle>
          <Button size="sm" variant="glass" onClick={() => setDraft({ ...EMPTY })} disabled={services.length >= 20}>
            <Plus className="size-4" />
            הוספה
          </Button>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-muted">למשל: ״תספורת לכלב קטן״, 60 דקות, 150 ₪. הלקוח בוחר שירות ואז יום ושעה.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {services.map((svc) => (
              <li
                key={svc.id}
                className={cn("flex items-center gap-3 rounded-2xl bg-[var(--glass-bg)] p-3", !svc.active && "opacity-60")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{svc.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {[durationLabel(svc.duration_min), svc.price, !svc.active && "מוסתר"].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`עריכת ${svc.name}`}
                  onClick={() =>
                    setDraft({
                      id: svc.id,
                      name: svc.name,
                      duration_min: svc.duration_min,
                      price: svc.price ?? "",
                      note: svc.note ?? "",
                      active: svc.active,
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`מחיקת ${svc.name}`} disabled={pending} onClick={() => remove(svc)}>
                  <Trash2 className="size-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <SectionTitle>מתי אפשר לקבוע</SectionTitle>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            התורים נקבעים בתוך שעות הפעילות של העסק.{" "}
            <Link href="/business/edit" className="font-medium text-brand-strong underline underline-offset-2 dark:text-brand">
              לשינוי השעות
            </Link>
          </span>
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Label>
            תור מתחיל כל
            <select
              className={SELECT}
              value={s.slot_step_min}
              onChange={(e) => setS({ ...s, slot_step_min: Number(e.target.value) })}
            >
              {SLOT_STEPS.map((n) => (
                <option key={n} value={n}>
                  {durationLabel(n)}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            אפשר לקבוע עד
            <select
              className={SELECT}
              value={s.min_notice_min}
              onChange={(e) => setS({ ...s, min_notice_min: Number(e.target.value) })}
            >
              {NOTICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            כמה זמן קדימה
            <select
              className={SELECT}
              value={s.max_days_ahead}
              onChange={(e) => setS({ ...s, max_days_ahead: Number(e.target.value) })}
            >
              {DAYS_AHEAD.map((n) => (
                <option key={n} value={n}>
                  {n === 7 ? "שבוע" : n === 14 ? "שבועיים" : n === 30 ? "חודש" : n === 60 ? "חודשיים" : "3 חודשים"}
                </option>
              ))}
            </select>
          </Label>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <SectionTitle>מדיניות ביטול</SectionTitle>
        <p className="text-sm text-muted">הלקוח רואה אותה בחלון לפני שהוא קובע, ומאשר שקרא.</p>
        <Textarea
          value={s.cancel_policy ?? ""}
          maxLength={800}
          placeholder="למשל: אפשר לבטל או להזיז עד 24 שעות לפני התור. ביטול מאוחר יותר או אי-הגעה יחויבו ב-50% ממחיר השירות."
          onChange={(e) => setS({ ...s, cancel_policy: e.target.value })}
        />
      </Card>

      <Button size="lg" className="self-center" loading={pending} onClick={() => save(s)}>
        שמירת ההגדרות
      </Button>

      <Dialog open={!!draft} onClose={() => setDraft(null)} title={draft?.id ? "עריכת שירות" : "שירות חדש"}>
        {draft && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submitService();
            }}
          >
            <Label>
              שם השירות
              <Input value={draft.name} maxLength={60} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Label>
                משך
                <select
                  className={SELECT}
                  value={draft.duration_min}
                  onChange={(e) => setDraft({ ...draft, duration_min: Number(e.target.value) })}
                >
                  {DURATIONS.map((n) => (
                    <option key={n} value={n}>
                      {durationLabel(n)}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                מחיר (לא חובה)
                <Input value={draft.price} maxLength={30} placeholder="150 ₪" onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </Label>
            </div>
            <Label>
              הערה ללקוח (לא חובה)
              <Input
                value={draft.note}
                maxLength={160}
                placeholder="למשל: כולל רחצה וייבוש"
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">מוצג ללקוחות</span>
              <Switch checked={draft.active} label="מוצג ללקוחות" onChange={(v) => setDraft({ ...draft, active: v })} />
            </div>
            <Button type="submit" loading={pending}>
              שמירה
            </Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
