import { Inbox, Mail } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Badge, Card, type Tone } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_KINDS } from "@/lib/contact";
import { FilterTabs } from "../users/filter-tabs";
import { StatusButton } from "./status-button";

export const metadata: Metadata = { title: "פניות" };

type Row = {
  id: string;
  kind: keyof typeof CONTACT_KINDS;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  page_url: string | null;
  status: "new" | "handled";
  created_at: string;
};

// Privacy requests have a legal response deadline (30 days), so they stand out.
const KIND_TONE: Record<Row["kind"], Tone> = {
  general: "neutral",
  business: "brand",
  report: "danger",
  privacy: "warning",
  accessibility: "warning",
};

export default async function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  await requirePermission("inbox.manage");
  const { status: raw } = await searchParams;
  const status = raw === "handled" ? "handled" : "new";

  const supabase = await createClient();
  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from("contact_requests")
      .select("id, kind, name, email, phone, message, page_url, status, created_at")
      .eq("status", status)
      .order("created_at", { ascending: status === "new" })
      .limit(100)
      .returns<Row[]>(),
    supabase.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">פניות</h1>
          <p className="mt-1 text-muted">
            צור קשר, דיווחים, בקשות פרטיות ונגישות. בקשות פרטיות — לענות תוך 30 יום; נגישות — תוך 60 יום.
          </p>
        </header>

        <FilterTabs
          param="status"
          current={status === "new" ? null : status}
          searchParams={{ status }}
          tabs={[
            { value: null, label: `פתוחות (${count ?? 0})` },
            { value: "handled", label: "טופלו" },
          ]}
        />

        {!rows?.length ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            <Inbox className="size-10 text-muted" />
            <p className="font-semibold">אין פניות כאן</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((c, i) => (
              <li key={c.id} className="glass-lite animate-rise flex flex-col gap-3 rounded-[1.75rem] p-5" style={{ "--i": i } as CSSProperties}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={KIND_TONE[c.kind]}>{CONTACT_KINDS[c.kind]}</Badge>
                  <span className="font-bold">{c.name}</span>
                  <span className="text-sm text-muted">{formatRelative(c.created_at)}</span>
                </div>
                <p className="whitespace-pre-line text-[15px] leading-relaxed">{c.message}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                  <a href={`mailto:${c.email}`} dir="ltr" className="inline-flex items-center gap-1.5 font-medium text-brand-strong dark:text-brand">
                    <Mail className="size-4" />
                    {c.email}
                  </a>
                  {c.phone && <span dir="ltr">{c.phone}</span>}
                  {c.page_url && (
                    <span dir="ltr" className="truncate">
                      {c.page_url}
                    </span>
                  )}
                  <span className="ms-auto">
                    <StatusButton id={c.id} handled={c.status === "handled"} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
