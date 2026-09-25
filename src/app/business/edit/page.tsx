import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getBusinessFilters } from "@/lib/catalog";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { Editor } from "./editor";

export const metadata: Metadata = { title: "עריכת עמוד העסק" };

export default async function EditBusinessPage({ searchParams }: PageProps<"/business/edit">) {
  await requireUser();
  const business = await getOwnBusiness();
  if (!business) redirect("/business/new");

  const supabase = await createClient();
  const [{ data: categories }, filters, { welcome }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, icon")
      .eq("is_visible", true)
      .order("sort_order")
      .returns<{ id: string; name: string; icon: string | null }[]>(),
    getBusinessFilters(),
    searchParams,
  ]);

  return (
    <Editor
      business={business}
      categories={categories ?? []}
      filters={filters}
      welcome={welcome === "1"}
    />
  );
}
