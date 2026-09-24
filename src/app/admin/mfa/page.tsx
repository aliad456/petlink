import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";
import { getCurrentProfile, getStaffContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "אימות דו-שלבי" };

// Every staff account must pass TOTP 2FA before reaching the panel.
// The database enforces this too: permissions only apply to aal2 sessions.
export default async function MfaPage() {
  if (!(await getCurrentProfile())) redirect("/login?next=/admin");
  const staff = await getStaffContext();
  if (!staff) notFound();
  if (staff.mfaVerified) redirect("/admin");

  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo size={40} />
      </div>
      <Card className="animate-rise w-full max-w-md p-7 sm:p-8">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--brand)_15%,transparent)] text-brand">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight">אימות דו-שלבי</h1>
        <p className="mb-6 mt-1.5 text-muted">
          {factor
            ? "הזינו את הקוד מאפליקציית האימות."
            : "חשבונות מנהלים מחייבים אימות דו-שלבי. פתחו את Google Authenticator, לחצו + ← סריקת קוד QR, וסרקו את הקוד."}
        </p>
        <MfaForm factorId={factor?.id ?? null} />
      </Card>
    </main>
  );
}
