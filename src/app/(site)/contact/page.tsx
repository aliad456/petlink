import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import { Card } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/session";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "צור קשר" };

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const [profile, sp] = await Promise.all([getCurrentProfile(), searchParams]);
  const kind = typeof sp.kind === "string" ? sp.kind : undefined;
  const page = typeof sp.page === "string" ? sp.page.slice(0, 300) : undefined;

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-8">
        <header className="animate-rise flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-kami text-white shadow-[0_10px_30px_rgb(37_99_235/0.3)]">
            <MessageCircle className="size-7" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">צור קשר</h1>
          <p className="max-w-sm text-muted">
            שאלה, תקלה, דיווח על תוכן או בקשה בנושא פרטיות — כתבו לנו ונחזור אליכם.
          </p>
        </header>
        <Card className="animate-rise p-7" style={{ "--i": 1 } as React.CSSProperties}>
          <ContactForm
            defaults={{ kind, page_url: page, name: profile?.full_name, email: profile?.email ?? undefined }}
          />
        </Card>
      </main>
    </PageTransition>
  );
}
