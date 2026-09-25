import "server-only";
import { cache } from "react";
import { getCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { first, PAGE, parseNear, type RawParams } from "./params";

export type SearchCategory = { id: string; slug: string; name: string; icon: string | null };
export type SearchFilter = {
  id: string;
  key: string;
  name: string;
  kind: "boolean" | "multi_select" | "open_now" | "distance";
  options: { value: string; label: string }[];
  category_ids: string[];
};
export type City = { name: string; aliases: string[]; lat: number; lng: number };

export type SearchResult = {
  id: string;
  public_id: number;
  name: string;
  tagline: string | null;
  city: string | null;
  category_name: string;
  category_icon: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  phone: string | null;
  whatsapp: string | null;
  hours: Record<string, [string, string][]>;
  is_featured: boolean;
  plan: "free" | "pro";
  distance_km: number | null;
  features: string[];
  total_count: number;
};

// Reference data for search: visible categories and filters, and the city list (cached).
// If the database is unreachable the page still renders (empty), instead of failing.
export const loadSearchContext = cache(async () => {
  try {
    const { categories, filters, cities } = await getCatalog();
    return { categories, filters, cities };
  } catch (error) {
    console.error("catalog unavailable", error);
    return { categories: [], filters: [], cities: [] };
  }
});

export function filtersFor(filters: SearchFilter[], categoryId: string | null) {
  return filters.filter((f) => !categoryId || f.category_ids.length === 0 || f.category_ids.includes(categoryId));
}

// Drop one prefix letter (ב/ל/מ/ו/ה) and normalise final letters, for loose matching.
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const norm = (w: string) => w.replace(/[ךםןףץ]/g, (c) => FINALS[c]);
const strip = (w: string) => norm(w.replace(/^[בלמוה](?=.{3})/, ""));

// Pulls a city ("ברמת גן", "בת״א") and a category ("וטרינר") out of free text.
export function parseText(text: string, categories: SearchCategory[], cities: City[]) {
  let rest = ` ${text} `;
  let city: City | null = null;

  const names = cities
    .flatMap((c) => [c.name, ...c.aliases].map((n) => ({ n, c })))
    .sort((a, b) => b.n.length - a.n.length);
  for (const { n, c } of names) {
    const re = new RegExp(`\\s[בלמ]?${n.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&").replace(/"/g, "[\"״]")}(?=\\s)`);
    if (re.test(rest)) {
      city = c;
      rest = rest.replace(re, " ");
      break;
    }
  }

  let category: SearchCategory | null = null;
  const words = rest.trim().split(/\s+/).filter(Boolean);
  for (const w of words) {
    // Try the word as typed and without a prefix letter ("לוטרינר" → "וטרינר").
    const variants = [norm(w), strip(w)].filter((t, i, a) => t.length >= 3 && a.indexOf(t) === i);
    // "וטרינר" → "וטרינרים", "מאלף" → "מאלפים", "ספר" → "ספרים"
    const match = categories.find((c) =>
      c.name
        .split(/\s+/)
        .map(norm)
        .some((cw) => variants.some((t) => cw.startsWith(t) || (cw.length >= 5 && t.startsWith(cw.slice(0, -2))))),
    );
    if (match) {
      category = match;
      rest = words.filter((x) => x !== w).join(" ");
      break;
    }
  }

  return { text: rest.trim().replace(/\s+/g, " "), city, category };
}

export async function runSearch(params: RawParams, opts: { category: SearchCategory | null }) {
  const ctx = await loadSearchContext();
  const q = (first(params.q) ?? "").trim().slice(0, 100);
  const parsed = q ? parseText(q, ctx.categories, ctx.cities) : { text: "", city: null, category: null };

  const category = opts.category ?? parsed.category;
  const cityParam = first(params.city);
  const city = (cityParam && ctx.cities.find((c) => c.name === cityParam || c.aliases.includes(cityParam))) || parsed.city;
  const near = parseNear(first(params.near));
  const openNow = first(params.open) === "1";
  const n = Math.min(96, Math.max(PAGE, Number(first(params.n)) || PAGE));

  const relevant = filtersFor(ctx.filters, category?.id ?? null);
  const bools: string[] = [];
  const options: Record<string, string[]> = {};
  const active: Record<string, string[]> = {};
  for (const f of relevant) {
    const v = first(params[f.key]);
    if (!v) continue;
    if (f.kind === "boolean" && v === "1") {
      bools.push(f.id);
      active[f.key] = ["1"];
    } else if (f.kind === "multi_select") {
      const chosen = v.split(",").filter((x) => f.options.some((o) => o.value === x));
      if (chosen.length) {
        options[f.id] = chosen;
        active[f.key] = chosen;
      }
    }
  }

  const origin = near ?? (city ? { lat: city.lat, lng: city.lng } : null);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_businesses", {
    p_text: parsed.text || null,
    p_category: category?.id ?? null,
    p_lat: origin?.lat ?? null,
    p_lng: origin?.lng ?? null,
    p_radius_km: near ? 30 : city ? 20 : null,
    p_open_now: openNow,
    p_bool_filters: bools,
    p_option_filters: options,
    p_limit: n,
    p_offset: 0,
  });
  if (error) throw error;
  const results = (data ?? []) as SearchResult[];

  return {
    ...ctx,
    q,
    text: parsed.text,
    category,
    detectedCategory: !opts.category && parsed.category ? parsed.category : null,
    city,
    near,
    openNow,
    n,
    active,
    relevant,
    results,
    total: results[0]?.total_count ?? 0,
  };
}

export type SearchState = Awaited<ReturnType<typeof runSearch>>;
