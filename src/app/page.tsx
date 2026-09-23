import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Category = { id: string; slug: string; name: string };
type Filter = { id: string; key: string; name: string };

export default async function HomePage() {
  const supabase = await createClient();
  const [profile, { data: categories }, { data: filters }] = await Promise.all([
    getCurrentProfile(),
    supabase
      .from("categories")
      .select("id, slug, name")
      .order("sort_order")
      .returns<Category[]>(),
    supabase
      .from("filters")
      .select("id, key, name")
      .eq("is_featured", true)
      .order("sort_order")
      .returns<Filter[]>(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <span className="text-2xl font-extrabold text-brand">PetLink</span>
        <Link
          href={profile ? "/account" : "/login"}
          className="text-sm font-medium underline"
        >
          {profile ? "החשבון שלי" : "התחברות"}
        </Link>
      </header>

      <section>
        <h1 className="text-3xl font-bold leading-tight">
          כל השירותים לחיות מחמד, במקום אחד
        </h1>
        <p className="mt-2 text-muted">
          וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ — עם פילטרים שגוגל מפות לא נותן.
        </p>
      </section>

      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">
          פילטרים
        </h2>
        <ul className="flex flex-wrap gap-2">
          {filters?.map((f) => (
            <li
              key={f.id}
              className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-sm font-medium"
            >
              {f.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-3 text-lg font-semibold">
          קטגוריות
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories?.map((c) => (
            <li
              key={c.id}
              className="rounded-2xl border border-border bg-card p-4 text-center font-medium"
            >
              {c.name}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
