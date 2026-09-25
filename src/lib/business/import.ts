// Parsing a pasted spreadsheet (Excel / Google Sheets copy = tab separated) or a
// CSV file into unclaimed-business rows for admin_import_unclaimed_businesses.
// Column names come from the data (categories, filters) — nothing hardcoded.

import type { FilterDef } from "./load";
import type { Hours } from "./types";

export type ImportCategory = { id: string; name: string; slug: string };

export type FilterInput = { filter_id: string; bool_value: boolean | null; option_values: string[] };

export type ImportRow = {
  name: string;
  category_id: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  bio: string;
  hours: Hours;
  open_on_holidays: boolean;
  filters: FilterInput[];
};

export type ParsedRow = { line: number; row: ImportRow | null; errors: string[]; preview: Record<string, string> };

export const MAX_IMPORT_ROWS = 200;

const FIELDS = [
  { key: "name", label: "שם", aliases: ["שם העסק", "name"] },
  { key: "category", label: "תחום", aliases: ["קטגוריה", "category"] },
  { key: "city", label: "עיר", aliases: ["city", "יישוב"] },
  { key: "address", label: "כתובת", aliases: ["address"] },
  { key: "phone", label: "טלפון", aliases: ["phone", "טל"] },
  { key: "whatsapp", label: "וואטסאפ", aliases: ["whatsapp", "ווטסאפ"] },
  { key: "website", label: "אתר", aliases: ["website", "אתר אינטרנט"] },
  { key: "bio", label: "תיאור", aliases: ["bio", "על העסק"] },
  { key: "hours", label: "שעות", aliases: ["hours", "שעות פעילות"] },
  { key: "holidays", label: "פתוח בחגים", aliases: ["holidays", "חגים"] },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const norm = (s: string) => s.trim().replace(/["'׳״]/g, "").replace(/\s+/g, " ").toLowerCase();

// ─── CSV / TSV ──────────────────────────────────────────────

export function parseTable(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n", 1)[0] ?? "";
  const sep = firstLine.includes("\t") ? "\t" : firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// A template the owner can open in Excel / Google Sheets (BOM so Hebrew shows).
export function templateCsv(categories: ImportCategory[], filters: FilterDef[]) {
  const headers = [...FIELDS.map((f) => f.label), ...filters.map((f) => f.name)];
  const example = [
    "מרפאה לדוגמה",
    categories[0]?.name ?? "",
    "באר שבע",
    "רחוב הרצל 1",
    "08-6000000",
    "",
    "https://example.co.il",
    "",
    "א-ה 09:00-19:00; ו 09:00-13:00",
    "לא",
    ...filters.map((f) => (f.kind === "boolean" ? "כן" : f.options.slice(0, 2).map((o) => o.label).join(", "))),
  ];
  return "﻿" + [headers, example].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

// ─── שעות ──────────────────────────────────────────────────

const DAY_WORDS: Record<string, number> = {
  א: 0, ראשון: 0, ב: 1, שני: 1, ג: 2, שלישי: 2, ד: 3, רביעי: 3, ה: 4, חמישי: 4, ו: 5, שישי: 5, ש: 6, שבת: 6,
};

function parseDayPart(part: string): number[] | null {
  const ids = part.split(/[-–]/).map((p) => DAY_WORDS[p.trim()]);
  if (ids.some((d) => d === undefined) || ids.length > 2) return null;
  if (ids.length === 1) return [ids[0]!];
  const out: number[] = [];
  for (let d = ids[0]!; ; d = (d + 1) % 7) {
    out.push(d);
    if (d === ids[1]) return out;
  }
}

// "א-ה" · "ראשון-חמישי" · "ו" · "א, ג, ה" · "א-ה וש"
function parseDays(spec: string): number[] | null {
  const s = spec.replace(/["'׳״]/g, "").replace(/^(ימים|יום|בימים)\s+/, "").trim();
  if (!s) return null;
  const out = new Set<number>();
  for (const part of s.split(/[,\s]+/).filter(Boolean)) {
    // "וש" = "and Saturday"; but "ו" alone / "ו-ש" is Friday
    const ids = parseDayPart(part) ?? (part.startsWith("ו") ? parseDayPart(part.slice(1)) : null);
    if (!ids) return null;
    ids.forEach((d) => out.add(d));
  }
  return [...out];
}

function toTime(t: string): string | null {
  const m = t.trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h === 24 && min === 0) return "23:59";
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// "א-ה 09:00-19:00; ו 9-13; ש סגור" · "24/7" · empty = no hours.
export function parseHours(text: string): Hours | null {
  const s = text.trim();
  if (!s) return {};
  if (/^(24\/7|24\s*שעות)/.test(s)) {
    return Object.fromEntries(["0", "1", "2", "3", "4", "5", "6"].map((d) => [d, [["00:00", "23:59"]]])) as Hours;
  }
  const hours: Hours = {};
  for (const seg of s.split(/[;|\n]+/).map((x) => x.trim()).filter(Boolean)) {
    const m = seg.match(/^([^\d]*?)\s*:?\s*(\d.*|סגור)$/);
    if (!m) return null;
    const days = parseDays(m[1]);
    if (!days) return null;
    if (m[2] === "סגור") {
      for (const d of days) delete hours[String(d) as keyof Hours];
      continue;
    }
    const ranges: [string, string][] = [];
    for (const r of m[2].split(/\s*[,/]\s*|\s+(?=\d)/).filter(Boolean)) {
      const [a, b, extra] = r.split(/\s*[-–]\s*/);
      const from = a && toTime(a);
      const to = b && toTime(b);
      if (!from || !to || extra !== undefined) return null;
      ranges.push([from, to]);
    }
    if (!ranges.length || ranges.length > 3) return null;
    for (const d of days) hours[String(d) as keyof Hours] = ranges;
  }
  return hours;
}

// ─── שורות ─────────────────────────────────────────────────

const PHONE = /^(\+972|0)[\d\s-]{8,13}$/;
const YES = new Set(["כן", "v", "✓", "✔", "x", "1", "yes", "true", "y"]);

function fixPhone(v: string) {
  const s = v.trim();
  if (!s) return "";
  // Excel drops the leading zero of 050…
  return /^[1-9]\d{7,8}$/.test(s) ? `0${s}` : s;
}

function fixWebsite(v: string) {
  const s = v.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function buildRows(table: string[][], categories: ImportCategory[], filters: FilterDef[]) {
  const [header = [], ...body] = table;
  type Column = { field: FieldKey } | { filter: FilterDef } | null;
  const columns = header.map((h): Column => {
    const n = norm(h);
    const field = FIELDS.find((f) => norm(f.label) === n || f.aliases.some((a) => norm(a) === n));
    if (field) return { field: field.key };
    const filter = filters.find((f) => norm(f.name) === n);
    if (filter) return { filter };
    return null;
  });
  const missing = (["name", "category", "city"] as const).filter((k) => !columns.some((c) => c && "field" in c && c.field === k));
  const unknown = header.filter((_, i) => !columns[i]);

  const rows: ParsedRow[] = body.slice(0, MAX_IMPORT_ROWS).map((cells, i) => {
    const get = (k: FieldKey) => {
      const idx = columns.findIndex((c) => c && "field" in c && c.field === k);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };
    const errors: string[] = [];
    const name = get("name");
    if (name.length < 2) errors.push("חסר שם");
    const catText = norm(get("category"));
    const category = categories.find((c) => norm(c.name) === catText || c.slug === catText);
    if (!category) errors.push(catText ? `תחום לא מוכר: ${get("category")}` : "חסר תחום");
    const city = get("city");
    if (city.length < 2) errors.push("חסרה עיר");
    const phone = fixPhone(get("phone"));
    if (phone && !PHONE.test(phone)) errors.push(`טלפון לא תקין: ${phone}`);
    const whatsapp = fixPhone(get("whatsapp"));
    if (whatsapp && !PHONE.test(whatsapp)) errors.push(`וואטסאפ לא תקין: ${whatsapp}`);
    const hours = parseHours(get("hours"));
    if (!hours) errors.push(`לא הבנתי את השעות: ${get("hours")}`);

    const filterValues: FilterInput[] = [];
    columns.forEach((c, idx) => {
      if (!c || !("filter" in c)) return;
      const f = c.filter;
      const v = (cells[idx] ?? "").trim();
      if (!v) return;
      if (category && f.category_ids.length && !f.category_ids.includes(category.id)) return;
      if (f.kind === "boolean") {
        if (YES.has(norm(v))) filterValues.push({ filter_id: f.id, bool_value: true, option_values: [] });
      } else if (f.kind === "multi_select") {
        const picked: string[] = [];
        for (const part of v.split(/[,/]+/).map(norm).filter(Boolean)) {
          const o = f.options.find((o) => norm(o.label) === part || o.value === part);
          if (o) picked.push(o.value);
          else errors.push(`${f.name}: לא מכיר "${part}"`);
        }
        if (picked.length) filterValues.push({ filter_id: f.id, bool_value: null, option_values: picked });
      }
    });

    const row: ImportRow | null =
      errors.length === 0 && category && hours
        ? {
            name,
            category_id: category.id,
            city,
            address: get("address"),
            phone,
            whatsapp,
            website: fixWebsite(get("website")),
            bio: get("bio"),
            hours,
            open_on_holidays: YES.has(norm(get("holidays"))),
            filters: filterValues,
          }
        : null;
    return {
      line: i + 2,
      row,
      errors,
      preview: { name, category: category?.name ?? get("category"), city, phone, hours: get("hours") },
    };
  });

  return { rows, missing: missing.map((k) => FIELDS.find((f) => f.key === k)!.label), unknown, tooMany: body.length > MAX_IMPORT_ROWS };
}
