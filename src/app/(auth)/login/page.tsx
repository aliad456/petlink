import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "התחברות" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <Card>
      <h1 className="mb-6 text-2xl font-bold">התחברות</h1>
      {error === "link" && (
        <p role="alert" className="mb-4 text-sm text-danger">
          הקישור פג תוקף או כבר נוצל. נסו שוב.
        </p>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-sm">
        אין לכם חשבון?{" "}
        <Link href="/signup" className="font-medium text-brand underline">
          הרשמה
        </Link>
      </p>
    </Card>
  );
}
