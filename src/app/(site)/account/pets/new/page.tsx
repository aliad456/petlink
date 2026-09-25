import { PawPrint } from "lucide-react";
import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { Card, FormMessage } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { NewPetForm } from "./new-pet-form";

export const metadata: Metadata = { title: "הוספת חיית מחמד" };

export default async function NewPetPage() {
  const profile = await requireUser();
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-8">
        <header className="animate-rise flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-kami text-white shadow-[0_10px_30px_rgb(37_99_235/0.3)]">
            <PawPrint className="size-7" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">חיית המחמד שלי</h1>
          <p className="max-w-sm text-muted">שם וסוג, ואתם בפנים. תמונות, חיסונים וכל השאר בשלב הבא.</p>
        </header>
        <Card className="animate-rise p-7" style={{ "--i": 1 } as React.CSSProperties}>
          {profile.account_type === "pet_owner" ? (
            <NewPetForm />
          ) : (
            <FormMessage error="החשבון שלך הוא חשבון עסק. חיות מחמד מוסיפים מחשבון של בעל/ת חיית מחמד." />
          )}
        </Card>
      </main>
    </PageTransition>
  );
}
