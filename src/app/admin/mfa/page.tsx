import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold">אימות דו-שלבי</h1>
        <p className="mb-6 text-sm text-muted">
          {factor
            ? "הזינו את הקוד מאפליקציית האימות."
            : "חשבונות מנהלים מחייבים אימות דו-שלבי. סרקו את הקוד באפליקציית אימות (Google Authenticator, Microsoft Authenticator או דומה) והזינו את הקוד שמופיע בה."}
        </p>
        <MfaForm factorId={factor?.id ?? null} />
      </Card>
    </main>
  );
}
