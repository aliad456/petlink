import "server-only";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

// Pages can be put in "maintenance mode" from the admin panel (קטגוריות ← מצב תחזוקה):
// visitors see a "back soon" screen, staff with site.maintenance see the real page.
// Category pages use their own path ("/vets"); "/b/*" covers every business page.

export const MAINTENANCE_TAG = "maintenance";

export const MAINTAINABLE_PAGES = [
  { path: "/plans", label: "תוכניות ומחירים לעסקים" },
  { path: "/", label: "דף הבית" },
  { path: "/search", label: "חיפוש" },
  { path: "/deals", label: "מבצעים" },
  { path: "/b/*", label: "עמודי עסקים (כולם)" },
  { path: "/contact", label: "צור קשר" },
] as const;

export const getClosedPages = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient().from("page_maintenance").select("path").eq("enabled", true);
    if (error) throw error;
    return (data ?? []).map((r) => r.path as string);
  },
  ["maintenance-v1"],
  { tags: [MAINTENANCE_TAG], revalidate: 300 },
);

// "open": show the page · "closed": show the maintenance screen · "preview": staff
// looking at a closed page (show it, with a reminder strip).
export async function maintenanceGate(path: string): Promise<"open" | "closed" | "preview"> {
  let closed: string[];
  try {
    closed = await getClosedPages();
  } catch {
    return "open"; // never take the site down because this lookup failed
  }
  if (!closed.includes(path)) return "open";
  // No auth cookie → a guest; skip the database round-trip.
  if (!(await cookies()).getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) return "closed";
  const { data } = await (await createClient()).rpc("has_permission", { permission: "site.maintenance" });
  return data === true ? "preview" : "closed";
}
