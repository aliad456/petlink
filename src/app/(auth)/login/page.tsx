import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui";
import { AuthCard } from "../auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "התחברות" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <AuthCard
      title="ברוכים השבים"
      subtitle="התחברו כדי להמשיך"
      footer={
        <>
          אין לכם חשבון?{" "}
          <Link
            href="/signup"
            transitionTypes={["nav-forward"]}
            className="font-semibold text-brand-strong hover:underline dark:text-brand"
          >
            הרשמה
          </Link>
        </>
      }
    >
      {error === "link" && (
        <div className="mb-5">
          <FormMessage error="הקישור כבר לא תקף, או שנפתח בדפדפן אחר. אם לחצתם על קישור לאישור המייל, הוא כנראה אושר, ואפשר פשוט להתחבר." />
        </div>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthCard>
  );
}
