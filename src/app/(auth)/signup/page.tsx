import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "הרשמה" };

export default function SignupPage() {
  return (
    <Card>
      <h1 className="mb-6 text-2xl font-bold">הרשמה ל-PetLink</h1>
      <SignupForm />
      <p className="mt-6 text-center text-sm">
        כבר רשומים?{" "}
        <Link href="/login" className="font-medium text-brand underline">
          התחברות
        </Link>
      </p>
    </Card>
  );
}
