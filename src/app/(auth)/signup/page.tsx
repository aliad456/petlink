import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "הרשמה" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { type } = await searchParams;
  return (
    <AuthCard
      title="הצטרפות ל-Kami"
      subtitle={type === "business" ? "הצטרפו למדריך והגיעו ללקוחות חדשים" : "חינם, תוך פחות מדקה"}
      footer={
        <>
          כבר רשומים?{" "}
          <Link
            href="/login"
            transitionTypes={["nav-back"]}
            className="font-semibold text-brand-strong hover:underline dark:text-brand"
          >
            התחברות
          </Link>
        </>
      }
    >
      <SignupForm defaultType={type === "business" ? "business_owner" : undefined} />
    </AuthCard>
  );
}
