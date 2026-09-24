"use client";

import {
  ArrowRight,
  Award,
  Clock,
  ExternalLink,
  Images,
  ListChecks,
  MapPin,
  Palette,
  Phone,
  Receipt,
  Send,
  Sparkles,
  Store,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { BusinessPage } from "@/components/business/business-page";
import { Logo } from "@/components/logo";
import { toast } from "@/components/toast";
import { Badge, Button, buttonClass, cn, FormMessage, type Tone } from "@/components/ui";
import type { BusinessRow, FilterDef } from "@/lib/business/load";
import type { BusinessStatus } from "@/lib/business/types";
import { saveBusiness, submitForReview, withdrawSubmission } from "../actions";
import { DesignFields } from "./design";
import { previewView, toForm, toSaveInput } from "./form-state";
import { MediaFields } from "./media";
import {
  BasicsFields,
  ContactFields,
  ExperienceFields,
  FeatureFields,
  HoursFields,
  LocationFields,
  Panel,
  PriceFields,
  type Update,
} from "./sections";

const STATUS: Record<BusinessStatus, { label: string; tone: Tone }> = {
  draft: { label: "טיוטה", tone: "neutral" },
  pending: { label: "ממתין לאישור", tone: "warning" },
  approved: { label: "באוויר", tone: "success" },
  suspended: { label: "מושהה", tone: "danger" },
  removed: { label: "הוסר", tone: "danger" },
};

export function Editor({
  business,
  categories,
  filters,
  welcome,
}: {
  business: BusinessRow;
  categories: { id: string; name: string; icon: string | null }[];
  filters: FilterDef[];
  welcome: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toForm(business));
  const [form, setForm] = useState(saved);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [saving, startSaving] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const [error, setError] = useState<string>();

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const update: Update = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);
  const preview = useMemo(() => previewView(business, form, categories, filters), [business, form, categories, filters]);
  const locked = business.status === "suspended" || business.status === "removed";

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const save = () =>
    startSaving(async () => {
      setError(undefined);
      const r = await saveBusiness(toSaveInput(form));
      if (r.error) {
        setError(r.error);
        toast.error(r.error);
        return;
      }
      setSaved(form);
      toast.success(r.ok ?? "נשמר");
      router.refresh();
    });

  const changeStatus = (action: typeof submitForReview) =>
    startStatus(async () => {
      if (dirty) {
        const r = await saveBusiness(toSaveInput(form));
        if (r.error) return void toast.error(r.error);
        setSaved(form);
      }
      const r = await action();
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
      router.refresh();
    });

  const status = STATUS[business.status];

  return (
    <div className="flex min-h-dvh flex-col">
      {/* סרגל עליון */}
      <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
        <Logo />
        <span className="hidden h-6 w-px bg-border sm:block" />
        <Link href="/account" transitionTypes={["nav-back"]} className="hidden items-center gap-1 text-sm text-muted hover:text-foreground sm:inline-flex">
          <ArrowRight className="size-4" />
          החשבון שלי
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <Link
            href={`/b/${business.public_id}`}
            target="_blank"
            className={buttonClass({ variant: "glass", size: "sm" })}
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">צפייה בעמוד</span>
          </Link>
          {business.status === "draft" && (
            <Button size="sm" loading={statusPending} onClick={() => changeStatus(submitForReview)}>
              <Send className="size-4" />
              שליחה לאישור
            </Button>
          )}
          {business.status === "draft" && business.status_reason && (
          <FormMessage error={`הצוות החזיר את העמוד לעריכה: ${business.status_reason}`} />
        )}
        {business.status === "pending" && (
            <Button size="sm" variant="ghost" loading={statusPending} onClick={() => changeStatus(withdrawSubmission)}>
              <Undo2 className="size-4" />
              ביטול שליחה
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4">
        {welcome && business.status === "draft" && (
          <div className="glass animate-rise flex items-start gap-3 rounded-3xl p-5">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" />
            <div className="flex flex-col gap-1">
              <p className="font-bold">העמוד נוצר! 🎉</p>
              <p className="text-sm text-muted">
                הוסיפו תמונות, שעות ומחירון, ותראו את העמוד מתעדכן בצד. כשמוכן — „שליחה לאישור”, והצוות שלנו
                יעלה אותו לאוויר.
              </p>
            </div>
          </div>
        )}
        {business.status === "draft" && business.status_reason && (
          <FormMessage error={`הצוות החזיר את העמוד לעריכה: ${business.status_reason}`} />
        )}
        {business.status === "pending" && (
          <p className="glass rounded-2xl px-4 py-3 text-sm">
            העמוד ממתין לאישור הצוות. אפשר להמשיך לערוך בינתיים.
          </p>
        )}
        {locked && (
          <FormMessage
            error={`העמוד ${business.status === "suspended" ? "הושהה" : "הוסר"}${business.status_reason ? `: ${business.status_reason}` : ""}. לפרטים פנו לשירות הלקוחות.`}
          />
        )}

        {/* מתג עריכה / תצוגה במובייל */}
        <div role="tablist" className="glass inline-flex self-center rounded-full p-1 lg:hidden">
          {(
            [
              ["edit", "עריכה"],
              ["preview", "תצוגה מקדימה"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "pressable rounded-full px-5 py-2 text-sm font-semibold",
                view === id ? "bg-[var(--glass-bg-strong)] shadow-sm" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 pb-32 pt-4 lg:grid-cols-[minmax(0,1fr)_440px]">
        <fieldset
          disabled={locked}
          className={cn("flex min-w-0 flex-col gap-3", view === "preview" && "hidden lg:flex")}
        >
          <Panel icon={Images} title="תמונות" hint="רקע, פרופיל וגלריה" defaultOpen>
            <MediaFields business={business} />
          </Panel>
          <Panel icon={Store} title="פרטים בסיסיים" hint="שם, תחום, בועת סטטוס ואודות" defaultOpen>
            <BasicsFields form={form} update={update} categories={categories} />
          </Panel>
          <Panel icon={Phone} title="יצירת קשר" hint="טלפון, וואטסאפ ורשתות">
            <ContactFields form={form} update={update} />
          </Panel>
          <Panel icon={MapPin} title="מיקום" hint="עיר, כתובת ואזור שירות">
            <LocationFields form={form} update={update} />
          </Panel>
          <Panel icon={Award} title="ניסיון והישגים" hint="פס ההישגים, שפות והסמכות">
            <ExperienceFields form={form} update={update} />
          </Panel>
          <Panel icon={Clock} title="שעות פעילות" hint="מהן מחושב התג 'פתוח עכשיו'">
            <HoursFields form={form} update={update} />
          </Panel>
          <Panel icon={ListChecks} title="מאפיינים" hint="מה שלקוחות מסננים לפיו">
            <FeatureFields form={form} update={update} filters={filters} />
          </Panel>
          <Panel icon={Receipt} title="מחירון">
            <PriceFields form={form} update={update} />
          </Panel>
          <Panel icon={Palette} title="עיצוב העמוד" hint="ברירת מחדל, אישי או PRO" defaultOpen>
            <DesignFields
              design={form.design}
              onChange={(d) => update("design", d)}
              onWaitlist={{ joined: !!business.pro_waitlist_at }}
            />
          </Panel>
        </fieldset>

        {/* תצוגה מקדימה חיה */}
        <aside className={cn("min-w-0", view === "edit" && "hidden lg:block")}>
          <div className="lg:sticky lg:top-4">
            <p className="mb-2 hidden text-center text-xs font-semibold uppercase tracking-wide text-muted lg:block">
              תצוגה מקדימה · מתעדכנת בזמן אמת
            </p>
            <div className="overflow-hidden rounded-[2.5rem] border border-[var(--glass-border)] bg-[var(--background)] shadow-[0_30px_80px_rgb(0_0_0/0.18)] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto [scrollbar-width:thin]">
              <BusinessPage business={preview} preview />
            </div>
          </div>
        </aside>
      </div>

      {/* סרגל שמירה */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-500 ease-spring",
          dirty || saving ? "translate-y-0" : "translate-y-[140%]",
        )}
      >
        <div className="glass glass-strong mx-auto flex max-w-xl items-center gap-3 rounded-3xl p-2.5 ps-5">
          <span className="flex-1 text-sm font-medium">{error ? <span className="text-danger">{error}</span> : "יש שינויים שלא נשמרו"}</span>
          <Button variant="ghost" size="sm" onClick={() => setForm(saved)} disabled={saving}>
            ביטול
          </Button>
          <Button size="sm" onClick={save} loading={saving} disabled={locked}>
            שמירה
          </Button>
        </div>
      </div>
    </div>
  );
}

