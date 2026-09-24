"use server";

import { loadSearchContext, parseText } from "@/lib/search/load";
import { createClient } from "@/lib/supabase/server";

export type Suggestion = {
  kind: "category" | "city" | "business" | "search";
  label: string;
  sub?: string;
  href: string;
  icon?: string | null;
};

// Autocomplete: categories and cities first, then matching businesses.
export async function suggest(input: string): Promise<Suggestion[]> {
  const q = input.trim().slice(0, 60);
  if (!q) return [];
  const { categories, cities } = await loadSearchContext();
  const parsed = parseText(q, categories, cities);
  const low = q.toLowerCase();
  const out: Suggestion[] = [];

  // "וטרינר ברמת גן" → one precise suggestion
  if (parsed.category && parsed.city) {
    out.push({
      kind: "search",
      label: `${parsed.category.name} ב${parsed.city.name}`,
      href: `/${parsed.category.slug}?city=${encodeURIComponent(parsed.city.name)}${parsed.text ? `&q=${encodeURIComponent(parsed.text)}` : ""}`,
      icon: parsed.category.icon,
    });
  }
  for (const c of categories) {
    if (c.name.includes(q) || (parsed.category?.id === c.id && !parsed.city)) {
      out.push({ kind: "category", label: c.name, href: `/${c.slug}`, icon: c.icon });
    }
  }
  for (const c of cities) {
    if (out.length >= 6) break;
    if (c.name.startsWith(q) || c.aliases.some((a) => a.startsWith(q))) {
      out.push({ kind: "city", label: c.name, sub: "כל השירותים בעיר", href: `/search?city=${encodeURIComponent(c.name)}` });
    }
  }

  const supabase = await createClient();
  // Search businesses with the understood parts (category, city) rather than the raw words.
  const understood = parsed.category || parsed.city;
  const { data } = await supabase.rpc("search_businesses", {
    p_text: understood ? parsed.text || null : low,
    p_category: parsed.category?.id ?? null,
    p_lat: parsed.city?.lat ?? null,
    p_lng: parsed.city?.lng ?? null,
    p_radius_km: parsed.city ? 20 : null,
    p_limit: 5,
  });
  for (const b of (data ?? []) as { public_id: number; name: string; city: string | null; category_name: string; category_icon: string | null }[]) {
    out.push({
      kind: "business",
      label: b.name,
      sub: [b.category_name, b.city].filter(Boolean).join(" · "),
      href: `/b/${b.public_id}`,
      icon: b.category_icon,
    });
  }
  return out.slice(0, 9);
}
