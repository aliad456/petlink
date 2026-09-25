"use client";

import { ChevronLeft, ChevronRight, Heart, ImagePlus, Megaphone, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, ChoiceTile, cn, FormMessage, Input, Label, Spinner, Switch, Textarea } from "@/components/ui";
import { AD_BUCKET, adMediaUrl } from "@/lib/ad-media";
import {
  addDays,
  monthGrid,
  monthKey,
  monthTitle,
  reservation,
  RESERVED_LABEL,
  shiftMonth,
  shortDate,
  WEEKDAYS_SHORT,
  type Rules,
} from "@/lib/ads-calendar";
import { compressImage } from "@/lib/business/media";
import { createClient } from "@/lib/supabase/client";
import { deleteCampaign, saveCampaign, type CampaignInput } from "./actions";
import type { PlacementRow } from "./data";

type Booked = Record<string, Record<string, { advertiser: string; kind: "ad" | "adoption" }[]>>;

export type CampaignFormProps = {
  id: string | null;
  initial: CampaignInput;
  initialDays: string[];
  initialPrice: number | null;
  placements: PlacementRow[];
  rules: Rules;
  booked: Booked;
  today: string;
  isOwner: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp";

async function readSize(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

export function CampaignForm(props: CampaignFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignInput>(props.initial);
  const [days, setDays] = useState<Set<string>>(new Set(props.initialDays));
  const [price, setPrice] = useState(props.initialPrice == null ? "" : String(props.initialPrice));
  const [error, setError] = useState<string>();
  const [reservedWarning, setReservedWarning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const placement = props.placements.find((p) => p.key === form.placement) ?? props.placements[0];
  const set = <K extends keyof CampaignInput>(key: K, value: CampaignInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = (force: boolean) => {
    setError(undefined);
    startTransition(async () => {
      const r = await saveCampaign(
        props.id,
        form,
        [...days].sort(),
        props.isOwner && price.trim() !== "" ? Number(price) : null,
        force,
      );
      if (r.reserved !== undefined) return setReservedWarning(r.reserved);
      if (r.error) return setError(r.error);
      toast.success(r.ok!);
      setReservedWarning(null);
      router.push(props.id ? `/admin/banners/${props.id}` : `/admin/banners/${r.id}`);
      router.refresh();
    });
  };

  const sortedDays = [...days].sort();

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
    >
      {/* סוג */}
      <Section title="סוג">
        <div className="grid grid-cols-2 gap-2.5">
          <ChoiceTile type="radio" name="kind" checked={form.kind === "ad"} onChange={() => set("kind", "ad")} className="gap-2">
            <Megaphone className="size-4" /> מודעה בתשלום
          </ChoiceTile>
          <ChoiceTile type="radio" name="kind" checked={form.kind === "adoption"} onChange={() => set("kind", "adoption")} className="gap-2">
            <Heart className="size-4" /> יום אימוץ (עמותה)
          </ChoiceTile>
        </div>
      </Section>

      {/* מיקום */}
      <Section title="איפה באתר">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {props.placements.map((p) => (
            <ChoiceTile
              key={p.key}
              type="radio"
              name="placement"
              checked={form.placement === p.key}
              onChange={() => {
                set("placement", p.key);
                if (p.kind === "popup") set("mobile_image_path", "");
              }}
              className="flex-col items-start gap-0.5 px-4 text-start"
            >
              <span>{p.label}</span>
              <span className="text-xs font-normal text-muted">
                עד {p.capacity} ביום · תמונה <span dir="ltr">{p.image_width}×{p.image_height}</span>
                {!p.is_active && " · כבוי כרגע"}
              </span>
            </ChoiceTile>
          ))}
        </div>
      </Section>

      {/* תמונות */}
      <Section title="תמונות">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField
            label={placement.kind === "popup" ? "תמונה לפופאפ (לאורך)" : "תמונה רחבה (מחשב)"}
            width={placement.image_width}
            height={placement.image_height}
            path={form.image_path}
            onChange={(p) => set("image_path", p)}
            required
          />
          {placement.mobile_width && placement.mobile_height && (
            <ImageField
              label="תמונה לטלפון (לא חובה)"
              hint="בלי תמונה לטלפון, תוצג הרחבה גם בטלפון (קטנה יותר)."
              width={placement.mobile_width}
              height={placement.mobile_height}
              path={form.mobile_image_path}
              onChange={(p) => set("mobile_image_path", p)}
            />
          )}
        </div>
        <Label>
          מה רואים במודעה? (לקוראי מסך)
          <Input
            value={form.alt_text}
            onChange={(e) => set("alt_text", e.target.value)}
            maxLength={150}
            placeholder="למשל: יום אימוץ של עמותת תנו לחיות, שבת 12:00 בפארק הירקון"
            required
          />
        </Label>
      </Section>

      {/* מפרסם */}
      <Section title={form.kind === "adoption" ? "העמותה" : "המפרסם"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label>
            שם
            <Input value={form.advertiser} onChange={(e) => set("advertiser", e.target.value)} maxLength={80} required />
          </Label>
          <Label>
            קישור בלחיצה (לא חובה)
            <Input value={form.link_url} onChange={(e) => set("link_url", e.target.value)} dir="ltr" placeholder="https://" />
          </Label>
          <Label>
            איש קשר
            <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} maxLength={80} />
          </Label>
          <Label>
            טלפון
            <Input value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} dir="ltr" type="tel" maxLength={20} />
          </Label>
          <Label>
            מייל (לשליחת הדוח)
            <Input value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} dir="ltr" type="email" maxLength={120} />
          </Label>
          {props.isOwner && (
            <Label>
              {form.kind === "adoption" ? "סכום (בד״כ 0 — טראפיק תמורת טראפיק)" : "כמה שולם (₪) — רק את/ה רואה"}
              <Input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} dir="ltr" inputMode="decimal" placeholder="0" />
            </Label>
          )}
        </div>
        <Label>
          הערות פנימיות
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            maxLength={1000}
            className="min-h-20"
            placeholder={form.kind === "adoption" ? "למשל: פרסמו אותנו בפייסבוק ובאינסטגרם ב-10/11" : undefined}
          />
        </Label>
      </Section>

      {/* ימים */}
      <Section title="באילו ימים">
        <DayPicker
          placement={placement}
          kind={form.kind}
          rules={props.rules}
          booked={props.booked[placement.key] ?? {}}
          today={props.today}
          days={days}
          setDays={setDays}
        />
        <p className="text-sm text-muted">
          {days.size === 0
            ? "לא נבחרו ימים"
            : `נבחרו ${days.size} ימים · ${shortDate(sortedDays[0])}–${shortDate(sortedDays[sortedDays.length - 1])}`}
        </p>
      </Section>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--glass-bg)] px-4 py-3">
        <div>
          <p className="font-medium">פעילה</p>
          <p className="text-sm text-muted">מודעה מושהית לא מוצגת ולא תופסת מקום בלוח.</p>
        </div>
        <Switch checked={form.status === "active"} onChange={(v) => set("status", v ? "active" : "paused")} label="פעילה" />
      </div>

      <FormMessage error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={pending}>
          {props.id ? "שמירה" : "יצירת המודעה"}
        </Button>
        {props.id && (
          <Button type="button" variant="glass" size="lg" onClick={() => setConfirmDelete(true)} className="text-danger">
            <Trash2 className="size-4" />
            מחיקה
          </Button>
        )}
      </div>

      <Dialog
        open={reservedWarning !== null}
        onClose={() => setReservedWarning(null)}
        title="חלק מהימים שמורים"
        description={`הימים ${reservedWarning} שמורים ל${form.kind === "adoption" ? "פרסום" : "ימי אימוץ"}. לפרסם בהם בכל זאת?`}
      >
        <div className="flex flex-row-reverse gap-2.5">
          <Button className="flex-1" loading={pending} onClick={() => save(true)}>
            כן, לפרסם
          </Button>
          <Button variant="glass" className="flex-1" onClick={() => setReservedWarning(null)}>
            אבחר ימים אחרים
          </Button>
        </div>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="למחוק את המודעה?" description="המודעה והנתונים שלה (חשיפות ולחיצות) יימחקו.">
        <div className="flex flex-row-reverse gap-2.5">
          <Button
            variant="danger"
            className="flex-1"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await deleteCampaign(props.id!);
                if (r.error) return void toast.error(r.error);
                toast.success(r.ok!);
                router.push("/admin/banners");
              })
            }
          >
            מחיקה
          </Button>
          <Button variant="glass" className="flex-1" onClick={() => setConfirmDelete(false)}>
            ביטול
          </Button>
        </div>
      </Dialog>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="glass-lite flex flex-col gap-4 rounded-[1.75rem] p-5">
      <legend className="sr-only">{title}</legend>
      <h2 className="text-lg font-bold" aria-hidden>
        {title}
      </h2>
      {children}
    </fieldset>
  );
}

// Checks the picture's proportions before upload, then scales it to the exact size.
function ImageField({
  label,
  hint,
  width,
  height,
  path,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  width: number;
  height: number;
  path: string;
  onChange: (path: string) => void;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const url = adMediaUrl(path);

  const pick = async (file: File) => {
    setError(undefined);
    setBusy(true);
    try {
      const size = await readSize(file);
      const ratio = size.width / size.height;
      const want = width / height;
      if (Math.abs(ratio - want) / want > 0.02) {
        setError(`התמונה צריכה להיות ${width}×${height} פיקסלים. התמונה שבחרת: ${size.width}×${size.height}.`);
        return;
      }
      if (size.width < width * 0.75) {
        setError(`התמונה קטנה מדי (${size.width}×${size.height}). צריך ${width}×${height} פיקסלים.`);
        return;
      }
      const blob = await compressImage(file, Math.max(width, height), 0.9);
      const name = `${crypto.randomUUID()}/${width}x${height}.webp`;
      const { error: upErr } = await createClient()
        .storage.from(AD_BUCKET)
        .upload(name, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (upErr) throw upErr;
      onChange(name);
    } catch {
      setError("ההעלאה נכשלה. נסו שוב.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {label}{" "}
        <span className="text-muted" dir="ltr">
          {width}×{height}
        </span>
      </span>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn(
          "pressable focus-ring relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[color-mix(in_oklab,var(--muted)_35%,transparent)] bg-[var(--glass-bg)]",
          width / height > 1.5 ? "aspect-[5/2]" : width === height ? "mx-auto aspect-square w-1/2" : "mx-auto aspect-[9/16] w-1/3",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 p-3 text-center text-sm text-muted">
            <ImagePlus className="size-6" />
            בחירת תמונה
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Spinner className="size-6 text-white" />
          </span>
        )}
      </button>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      {/* keeps the native "required" check */}
      {required && <input tabIndex={-1} aria-hidden className="sr-only" value={path} onChange={() => {}} required />}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {path && !required && (
        <button type="button" className="self-start text-xs text-danger" onClick={() => onChange("")}>
          הסרת התמונה
        </button>
      )}
      <FormMessage error={error} />
    </div>
  );
}

function DayPicker({
  placement,
  kind,
  rules,
  booked,
  today,
  days,
  setDays,
}: {
  placement: PlacementRow;
  kind: "ad" | "adoption";
  rules: Rules;
  booked: Record<string, { advertiser: string; kind: "ad" | "adoption" }[]>;
  today: string;
  days: Set<string>;
  setDays: (d: Set<string>) => void;
}) {
  const firstSelected = [...days].sort()[0];
  const [month, setMonth] = useState(monthKey(firstSelected ?? today));
  const [runLength, setRunLength] = useState("5");
  const [runStart, setRunStart] = useState(firstSelected ?? today);
  const mine = kind === "adoption" ? "adoption" : "ads";

  const isFull = (d: string) => (booked[d]?.length ?? 0) >= placement.capacity;
  const toggle = (d: string) => {
    const next = new Set(days);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setDays(next);
  };

  const conflicts = useMemo(
    () =>
      [...days].sort().filter((d) => {
        const r = reservation(d, rules).reserved;
        return r && r !== mine;
      }),
    [days, rules, mine],
  );
  const full = [...days].sort().filter(isFull);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-[var(--glass-bg)] p-3">
        <Label className="w-24">
          ימים
          <Input value={runLength} onChange={(e) => setRunLength(e.target.value.replace(/\D/g, ""))} inputMode="numeric" dir="ltr" className="h-10" />
        </Label>
        <Label className="flex-1">
          החל מ-
          <Input type="date" value={runStart} min={today} onChange={(e) => setRunStart(e.target.value)} dir="ltr" className="h-10" />
        </Label>
        <Button
          type="button"
          size="sm"
          variant="glass"
          onClick={() => {
            const n = Math.min(Number(runLength) || 0, 366);
            const next = new Set(days);
            for (let i = 0; i < n; i++) next.add(addDays(runStart, i));
            setDays(next);
            setMonth(monthKey(runStart));
          }}
        >
          הוספת ימים רצופים
        </Button>
        {days.size > 0 && (
          <Button type="button" size="sm" variant="glass" onClick={() => setDays(new Set())}>
            ניקוי
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" size="sm" variant="glass" aria-label="החודש הקודם" onClick={() => setMonth(shiftMonth(month, -1))}>
          <ChevronRight className="size-4" />
        </Button>
        <span className="font-bold">{monthTitle(month)}</span>
        <Button type="button" size="sm" variant="glass" aria-label="החודש הבא" onClick={() => setMonth(shiftMonth(month, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {monthGrid(month).map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d, di) => {
              if (!d) return <span key={di} />;
              const { reserved, label } = reservation(d, rules);
              const count = booked[d]?.length ?? 0;
              const selected = days.has(d);
              const disabled = d < today || (isFull(d) && !selected);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggle(d)}
                  title={[label, reserved && RESERVED_LABEL[reserved], `${count}/${placement.capacity} תפוסים`].filter(Boolean).join(" · ")}
                  className={cn(
                    "focus-ring flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors",
                    selected
                      ? "border-transparent bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white"
                      : cn(
                          "border-[var(--border)]",
                          reserved === "adoption" && "bg-emerald-400/15",
                          reserved === "ads" && "bg-sky-400/15",
                        ),
                    disabled && "cursor-not-allowed opacity-35",
                  )}
                >
                  {Number(d.slice(8))}
                  <span className={cn("text-[10px] font-medium", selected ? "text-white/85" : "text-muted")}>
                    {count}/{placement.capacity}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-emerald-400/25" /> {RESERVED_LABEL.adoption}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-sky-400/25" /> {RESERVED_LABEL.ads}
        </span>
        <span>המספר = כמה מודעות כבר תפוסות באותו יום</span>
      </div>

      {conflicts.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] px-4 py-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          הימים {conflicts.map(shortDate).join(", ")} שמורים ל{mine === "ads" ? "ימי אימוץ" : "פרסום"}. אפשר לפרסם בהם, אבל תתבקש/י לאשר.
        </p>
      )}
      {full.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] px-4 py-3 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          בימים {full.map(shortDate).join(", ")} המיקום מלא. הסירו אותם או בחרו מיקום אחר.
        </p>
      )}
    </div>
  );
}
