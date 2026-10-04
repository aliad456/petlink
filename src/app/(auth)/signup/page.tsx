import type { Metadata } from "next";
import Link from "next/link";
import { safeNextPath } from "@/lib/auth/redirect";
import { signupSource } from "@/lib/signup";
import { AuthCard } from "../auth-card";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "הרשמה" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { type, next: rawNext, src } = await searchParams;
  const next = typeof rawNext === "string" ? rawNext : undefined;
  const source = signupSource(src, safeNextPath(next), type === "business" ? "business_owner" : undefined);
  return (
    <AuthCard
      title="הצטרפות ל-Kami"
      subtitle={type === "business" ? "הצטרפו למדריך והגיעו ללקוחות חדשים" : "חינם, תוך פחות מדקה"}
      footer={
        <>
          כבר רשומים?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            transitionTypes={["nav-back"]}
            className="font-semibold text-brand-strong hover:underline dark:text-brand"
          >
            התחברות
          </Link>
        </>
      }
    >
      <SignupForm defaultType={type === "business" ? "business_owner" : undefined} next={next} source={source} />
    </AuthCard>
  );
}
