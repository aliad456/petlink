import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "הרשמה" };

export default function SignupPage() {
  return (
    <AuthCard
      title="הצטרפות ל-PetLink"
      subtitle="חינם, תוך פחות מדקה"
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
      <SignupForm />
    </AuthCard>
  );
}
