"use client";

import {
  BadgeCheck,
  CalendarCheck,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  EyeOff,
  Images,
  Link2,
  Megaphone,
  BellRing,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Badge, Button, cn } from "@/components/ui";
import {
  ACCENTS,
  resolveDesign,
  SECTION_IDS,
  SECTION_LABEL,
  type AccentKey,
  type Design,
  type Layout,
} from "@/lib/business/types";
import { joinProWaitlist } from "../actions";

export function DesignFields({
  design,
  onChange,
  onWaitlist,
}: {
  design: Design;
  onChange: (d: Design) => void;
  onWaitlist: { joined: boolean };
}) {
  const [proOpen, setProOpen] = useState(false);
  const personal = design.mode === "personal";
  const current = resolveDesign(design);
  const sections =
    design.sections?.length === SECTION_IDS.length
      ? design.sections
      : SECTION_IDS.map((id) => design.sections?.find((s) => s.id === id) ?? { id, visible: true });

  const setPersonal = (patch: Partial<Design>) =>
    onChange({
      mode: "personal",
      accent: design.accent ?? "teal",
      layout: design.layout ?? "classic",
      sections,
      ...patch,
    });

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <ModeCard
          active={!personal}
          onClick={() => onChange({ ...design, mode: "default" })}
          title="ברירת מחדל"
          subtitle="Liquid Glass מוכן"
          preview={<MiniPage from="#2dd4bf" to="#0e7490" />}
        />
        <ModeCard
          active={personal}
          onClick={() => setPersonal({})}
          title="אישי"
          subtitle="צבע, פריסה וסדר"
          preview={<MiniPage from={current.accent.from} to={current.accent.to} side={design.layout === "side"} />}
        />
        <ModeCard
          active={false}
          onClick={() => setProOpen(true)}
          title={
            <span className="inline-flex items-center gap-1">
              PRO <Crown className="size-3.5 text-amber-500" />
            </span>
          }
          subtitle="בקרוב"
          pro
          preview={<MiniPage from="#fbbf24" to="#b45309" pro />}
        />
      </div>

      {personal && (
        <div className="animate-rise flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">צבע</legend>
            <div className="flex flex-wrap gap-2.5">
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={ACCENTS[key].label}
                  aria-pressed={(design.accent ?? "teal") === key}
                  title={ACCENTS[key].label}
                  onClick={() => setPersonal({ accent: key })}
                  style={{ background: `linear-gradient(135deg, ${ACCENTS[key].from}, ${ACCENTS[key].to})` }}
                  className={cn(
                    "pressable focus-ring size-10 rounded-full shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]",
                    (design.accent ?? "teal") === key &&
                      "ring-2 ring-foreground ring-offset-2 ring-offset-[var(--background)]",
                  )}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">פריסה</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ["classic", "ממורכז", "כמו פרופיל: תמונה באמצע"],
                  ["side", "צד", "תמונה בצד והשם לידה"],
                ] as [Layout, string, string][]
              ).map(([id, title, sub]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={(design.layout ?? "classic") === id}
                  onClick={() => setPersonal({ layout: id })}
                  className={cn(
                    "pressable focus-ring glass flex flex-col gap-0.5 rounded-2xl p-3.5 text-start",
                    (design.layout ?? "classic") === id &&
                      "!border-[color-mix(in_oklab,var(--brand)_55%,transparent)] !bg-[color-mix(in_oklab,var(--brand)_14%,var(--glass-bg))]",
                  )}
                >
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-xs text-muted">{sub}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">סדר החלקים בעמוד</legend>
            <ul className="flex flex-col gap-1.5">
              {sections.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl bg-[var(--glass-bg)] py-1.5 pe-1.5 ps-4",
                    !s.visible && "opacity-55",
                  )}
                >
                  <span className="flex-1 text-sm font-medium">{SECTION_LABEL[s.id]}</span>
                  <IconButton
                    label="למעלה"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...sections];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setPersonal({ sections: next });
                    }}
                  >
                    <ChevronUp className="size-4" />
                  </IconButton>
                  <IconButton
                    label="למטה"
                    disabled={i === sections.length - 1}
                    onClick={() => {
                      const next = [...sections];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      setPersonal({ sections: next });
                    }}
                  >
                    <ChevronDown className="size-4" />
                  </IconButton>
                  <IconButton
                    label={s.visible ? "הסתרה" : "הצגה"}
                    onClick={() =>
                      setPersonal({
                        sections: sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)),
                      })
                    }
                  >
                    {s.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </IconButton>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      )}

      <ProDialog open={proOpen} onClose={() => setProOpen(false)} joined={onWaitlist.joined} />
    </>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable focus-ring inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-[var(--glass-bg-strong)] hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  subtitle,
  preview,
  pro,
}: {
  active: boolean;
  onClick: () => void;
  title: React.ReactNode;
  subtitle: string;
  preview: React.ReactNode;
  pro?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable focus-ring glass relative flex flex-col items-center gap-2 overflow-hidden rounded-3xl p-2.5 pb-3 text-center",
        active &&
          "!border-[color-mix(in_oklab,var(--brand)_60%,transparent)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--brand)_45%,transparent),var(--glass-shadow)]",
        pro &&
          "!border-amber-400/60 bg-[linear-gradient(160deg,rgb(251_191_36/0.18),transparent_60%)]",
      )}
    >
      {preview}
      <span className="text-sm font-bold">{title}</span>
      <span className={cn("-mt-1.5 text-[11px]", pro ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted")}>
        {subtitle}
      </span>
    </button>
  );
}

// A tiny illustration of the page for the mode cards.
function MiniPage({ from, to, side, pro }: { from: string; to: string; side?: boolean; pro?: boolean }) {
  return (
    <span aria-hidden className="relative block h-20 w-full overflow-hidden rounded-2xl bg-[var(--glass-bg-strong)]">
      <span className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} />
      <span
        className={cn(
          "absolute top-4 size-8 rounded-full border-2 border-[var(--background)]",
          side ? "start-2" : "left-1/2 -translate-x-1/2",
          pro && "animate-[spin_3s_linear_infinite]",
        )}
        style={{
          background: pro ? `conic-gradient(${from}, #fff7, ${to}, ${from})` : `linear-gradient(135deg, ${from}, ${to})`,
        }}
      />
      <span
        className={cn("absolute top-13 h-1.5 w-10 rounded-full bg-foreground/25", side ? "start-11 top-9" : "left-1/2 -translate-x-1/2")}
      />
      <span
        className="absolute bottom-2 left-1/2 h-2.5 w-3/5 -translate-x-1/2 rounded-full"
        style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
      />
    </span>
  );
}

// ─── PRO ────────────────────────────────────────────────────

const PRO_FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: TrendingUp, title: "מופיעים ראשונים", text: "בראש החיפוש בקטגוריה ובעיר שלכם" },
  { icon: BadgeCheck, title: "תג PRO ומסגרת זוהרת", text: "תמונת פרופיל עם טבעת מונפשת שבולטת מיד" },
  { icon: Sparkles, title: "ערכות עיצוב פרימיום", text: "גרדיאנטים, רקע זכוכית צבעוני וגופנים מיוחדים" },
  { icon: Images, title: "רקע מתחלף וגלריה בלי הגבלה", text: "כמה תמונות רקע שמתחלפות, וכמה תמונות שרוצים" },
  { icon: Megaphone, title: "באנר מבצעים", text: "פס מבצע בולט בראש העמוד שלכם" },
  { icon: CalendarCheck, title: "קביעת תור מהעמוד", text: "טופס פנייה ישיר, בלי לפספס לקוחות" },
  { icon: ChartColumn, title: "סטטיסטיקות אמיתיות", text: "כמה צפו, התקשרו, שלחו וואטסאפ וניווטו אליכם" },
  { icon: Link2, title: "כתובת אישית", text: "petlink.co.il/השם-שלכם במקום מספר" },
];

function ProDialog({ open, onClose, joined }: { open: boolean; onClose: () => void; joined: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(joined);

  return (
    <Dialog open={open} onClose={onClose} title="PetLink PRO" className="!w-[min(100%-2rem,34rem)]">
      <div className="flex flex-col gap-5">
        <div className="relative -mt-2 flex flex-col items-center gap-3 overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#fbbf24,#b45309)] px-5 py-6 text-center text-white">
          <div aria-hidden className="absolute inset-0 bg-white/20 [mask:url(/doodles.svg)_0_0/300px_300px_repeat]" />
          <span className="relative inline-flex size-20 items-center justify-center rounded-full p-[3px] [background:conic-gradient(#fff,#fde68a,#fff7,#fde68a,#fff)] motion-safe:animate-[spin_4s_linear_infinite]">
            <span className="flex size-full items-center justify-center rounded-full bg-[#b45309] motion-safe:animate-[spin_4s_linear_infinite_reverse]">
              <Crown className="size-9" />
            </span>
          </span>
          <div className="relative">
            <p className="text-2xl font-extrabold">העמוד שלכם, ברמה אחרת</p>
            <p className="mt-1 text-sm text-white/85">כל מה שצריך כדי לבלוט מעל כולם</p>
          </div>
          <Badge className="relative !bg-white/25 !text-white">בקרוב</Badge>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {PRO_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-400">
                <f.icon className="size-[18px]" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{f.title}</span>
                <span className="text-xs text-muted">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--glass-bg)] p-4 text-center">
          <p className="text-sm text-muted">
            צפוי: <span className="font-bold text-foreground">39.90 ₪ לחודש</span> · מסלול סטודנטים ובוגרים 19.90 ₪
          </p>
          {done ? (
            <p className="flex items-center gap-1.5 font-semibold text-success">
              <BadgeCheck className="size-5" />
              אתם ברשימה. נעדכן אתכם ראשונים.
            </p>
          ) : (
            <Button
              type="button"
              loading={pending}
              className="w-full !bg-[linear-gradient(180deg,#fbbf24,#b45309)] !text-white"
              onClick={() =>
                startTransition(async () => {
                  const r = await joinProWaitlist();
                  if (r.error) toast.error(r.error);
                  else {
                    setDone(true);
                    if (r.ok) toast.success(r.ok);
                  }
                })
              }
            >
              <BellRing className="size-4" />
              עדכנו אותי כש-PRO מוכן
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
