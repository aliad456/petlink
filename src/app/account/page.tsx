import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { SignOutButton } from "@/components/sign-out-button";
import { getStaffContext, requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "החשבון שלי" };

const ACCOUNT_TYPE_LABEL = {
  pet_owner: "בעל/ת חיית מחמד",
  business_owner: "בעל/ת עסק",
} as const;

export default async function AccountPage() {
  const profile = await requireUser();
  const staff = await getStaffContext();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-2xl font-extrabold text-brand">
          PetLink
        </Link>
        <SignOutButton />
      </header>

      {profile.status !== "active" && (
        <Card className="border-danger text-danger">
          החשבון {profile.status === "locked" ? "נעול" : "חסום"}. לפרטים פנו לשירות
          הלקוחות.
        </Card>
      )}

      <Card>
        <h1 className="mb-1 text-xl font-bold">החשבון שלי</h1>
        <p className="mb-6 text-sm text-muted" dir="auto">
          {profile.email} · {ACCOUNT_TYPE_LABEL[profile.account_type]}
        </p>
        <ProfileForm profile={profile} />
      </Card>

      {staff && (
        <Link href="/admin" className="text-center font-medium text-brand underline">
          לפאנל הניהול
        </Link>
      )}
    </main>
  );
}
