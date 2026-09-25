"use client";

import { CircleAlert, CircleCheck, Download, FileSpreadsheet, Upload } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, buttonClass, FormMessage, Textarea, cn } from "@/components/ui";
import { buildRows, MAX_IMPORT_ROWS, parseTable, templateCsv, type ImportCategory } from "@/lib/business/import";
import type { FilterDef } from "@/lib/business/load";
import { importUnclaimedBusinesses } from "./actions";

// Many unclaimed pages at once: paste rows copied from Excel / Google Sheets,
// or upload a CSV. Every row is checked before anything is saved.
export function ImportBusinessesButton({
  categories,
  filters,
}: {
  categories: ImportCategory[];
  filters: FilterDef[];
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" />
        ייבוא מטבלה
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setKey((k) => k + 1);
        }}
        title="ייבוא עסקים מטבלה"
        description="העתיקו שורות מאקסל או מגוגל שיטס (כולל שורת הכותרות) והדביקו כאן, או העלו קובץ CSV. רק מידע ציבורי."
      >
        <ImportForm key={key} categories={categories} filters={filters} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function ImportForm({
  categories,
  filters,
  onDone,
}: {
  categories: ImportCategory[];
  filters: FilterDef[];
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const result = useMemo(
    () => (text.trim() ? buildRows(parseTable(text), categories, filters) : null),
    [text, categories, filters],
  );
  const good = result?.rows.filter((r) => r.row) ?? [];
  const bad = result?.rows.filter((r) => !r.row) ?? [];
  const blocked = !result || result.missing.length > 0 || good.length === 0 || bad.length > 0;

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([templateCsv(categories, filters)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "kami-businesses.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = () =>
    startTransition(async () => {
      setError(undefined);
      const res = await importUnclaimedBusinesses(good.map((r) => r.row));
      if (res.error) setError(res.error);
      else {
        toast.success(res.ok ?? "נוסף");
        onDone();
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={downloadTemplate}>
          <Download className="size-4" />
          הורדת תבנית
        </Button>
        <label className={buttonClass({ variant: "ghost", size: "sm", className: "cursor-pointer" })}>
          <Upload className="size-4" />
          העלאת CSV
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setText(await file.text());
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        dir="auto"
        placeholder={"שם\tתחום\tעיר\tטלפון\tשעות\nמרפאה לדוגמה\tוטרינרים\tאילת\t08-6000000\tא-ה 9-19; ו 9-13"}
        className="min-h-32 font-mono text-sm"
        aria-label="טבלה להדבקה"
      />

      <details className="text-sm text-muted">
        <summary className="cursor-pointer">איך כותבים שעות ומאפיינים?</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-5">
          <li>
            שעות: <b dir="rtl">א-ה 09:00-19:00; ו 09:00-13:00</b> · אפשר גם <b>ראשון-חמישי 9-19</b>, שני טווחים{" "}
            <b>א-ה 8-13, 16-19</b>, <b>ש סגור</b> או <b dir="ltr">24/7</b>.
          </li>
          <li>עמודה בשם של מאפיין כן/לא (למשל &quot;{filters.find((f) => f.kind === "boolean")?.name ?? "מגיע לבית"}&quot;): כתבו כן.</li>
          <li>מאפיין עם אפשרויות (למשל סוג חיה): כמה ערכים מופרדים בפסיק.</li>
          <li>התחום חייב להיות בדיוק כמו בקטגוריות באתר. עד {MAX_IMPORT_ROWS} שורות בכל ייבוא.</li>
        </ul>
      </details>

      {result && (
        <div className="flex flex-col gap-2">
          {result.missing.length > 0 && (
            <p className="text-sm text-danger">חסרות עמודות: {result.missing.join(", ")}</p>
          )}
          {result.unknown.length > 0 && (
            <p className="text-sm text-warning">עמודות שלא זוהו ולא ייובאו: {result.unknown.join(", ")}</p>
          )}
          {result.tooMany && (
            <p className="text-sm text-warning">יש יותר מ-{MAX_IMPORT_ROWS} שורות — רק הראשונות נבדקו.</p>
          )}
          <p className="text-sm font-semibold">
            {good.length} שורות תקינות{bad.length > 0 && <span className="text-danger"> · {bad.length} עם שגיאות</span>}
          </p>
          <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-sm">
            {result.rows.map((r) => (
              <li
                key={r.line}
                className={cn(
                  "glass-lite flex items-start gap-2 rounded-xl px-3 py-2",
                  !r.row && "ring-1 ring-[color-mix(in_oklab,var(--danger)_45%,transparent)]",
                )}
              >
                {r.row ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-label="תקין" />
                ) : (
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-label="שגיאה" />
                )}
                <div className="min-w-0">
                  <div className="truncate">
                    <span className="text-muted">שורה {r.line} · </span>
                    <b>{r.preview.name || "—"}</b> · {r.preview.category} · {r.preview.city}
                  </div>
                  {r.errors.length > 0 && <div className="text-danger">{r.errors.join(" · ")}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormMessage error={error} />
      <Button type="button" onClick={submit} loading={pending} disabled={blocked}>
        {bad.length > 0 ? "תקנו את השורות המסומנות" : `ייבוא ${good.length || ""} עסקים`}
      </Button>
    </div>
  );
}
