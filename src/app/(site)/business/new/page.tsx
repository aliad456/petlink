import { Store } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageTransition } from "@/components/page-transition";
import { Card, FormMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { getOwnBusiness } from "@/lib/business/own";
import { createClient } from "@/lib/supabase/server";
import { NewBusinessForm } from "./new-business-form";

export const metadata: Metadata = { title: "פתיחת עמוד עסק" };

export default async function NewBusinessPage() {
  const profile = await requireUser();
  if (await getOwnBusiness()) redirect("/business/edit");

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .eq("is_visible", true)
    .order("sort_order")
    .returns<{ id: string; name: string; icon: string | null }[]>();

  return (
    <>
      <PageTransition>
        <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-8">
          <header className="animate-rise flex flex-col items-center gap-3 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-kami text-white shadow-[0_10px_30px_rgb(37_99_235/0.3)]">
              <Store className="size-7" />
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">פותחים עמוד לעסק</h1>
            <p className="max-w-sm text-muted">
              ארבעה פרטים ואתם בפנים. את השאר — תמונות, שעות, מחירון ועיצוב — ממלאים בעורך.
            </p>
          </header>
          <Card className="animate-rise p-7" style={{ "--i": 1 } as React.CSSProperties}>
            {profile.account_type === "business_owner" ? (
              <NewBusinessForm categories={categories ?? []} />
            ) : (
              <FormMessage error="החשבון שלך רשום כבעל/ת חיית מחמד. כדי לפתוח עמוד עסק צריך להירשם עם חשבון של בעל/ת עסק." />
            )}
          </Card>
        </main>
      </PageTransition>
    </>
  );
}
