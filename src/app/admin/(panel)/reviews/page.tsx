import { Flag, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PageTransition } from "@/components/page-transition";
import { Stars } from "@/components/reviews/stars";
import { Badge, Card } from "@/components/ui";
import { requirePermission } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { REPORT_REASONS, type ReportReason } from "@/lib/reviews/types";
import { createClient } from "@/lib/supabase/server";
import { FilterTabs } from "../users/filter-tabs";
import { ReviewModeration } from "./review-moderation";

export const metadata: Metadata = { title: "ביקורות" };

type Row = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  status: "published" | "hidden" | "removed";
  status_reason: string | null;
  reply: string | null;
  created_at: string;
  business: { name: string; public_id: number } | null;
  reports: { reason: ReportReason; note: string | null; status: string; created_at: string }[];
};

const TABS = [
  { value: null, label: "דיווחים פתוחים" },
  { value: "all", label: "כל הביקורות" },
  { value: "removed", label: "הוסרו" },
] as const;

export default async function ReviewsAdminPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requirePermission("reviews.moderate");
  const { view: raw } = await searchParams;
  const view = raw === "all" || raw === "removed" ? raw : null;

  const supabase = await createClient();
  const select =
    "id, author_name, rating, body, status, status_reason, reply, created_at, business:businesses(name, public_id), reports:review_reports(reason, note, status, created_at)";

  let query = supabase.from("reviews").select(select).order("created_at", { ascending: false }).limit(100);
  if (view === "removed") query = query.eq("status", "removed");
  else if (view === "all") query = query.neq("status", "removed");
  else {
    const { data: open } = await supabase.from("review_reports").select("review_id").eq("status", "open");
    const ids = [...new Set((open ?? []).map((r) => r.review_id as string))];
    query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: rows } = await query.returns<Row[]>();

  return (
    <PageTransition>
      <div className="flex max-w-4xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight">ביקורות</h1>
          <p className="mt-1 text-muted">
            ביקורות עולות לאתר מיד. כאן מטפלים בדיווחים: ביקורת עם 3 דיווחים מוסתרת אוטומטית עד להחלטה. הסרה רק כשהביקורת
            מפרה את התנאים — לא בגלל שהיא שלילית.
          </p>
        </header>

        <FilterTabs param="view" current={view} searchParams={{ view: view ?? undefined }} tabs={[...TABS]} />

        {!rows?.length ? (
          <Card className="flex flex-col items-center gap-3 py-14 text-center">
            {view ? <Star className="size-10 text-muted" /> : <Flag className="size-10 text-muted" />}
            <p className="font-semibold">{view ? "אין ביקורות כאן" : "אין דיווחים פתוחים 🎉"}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const open = r.reports.filter((x) => x.status === "open");
              return (
                <li key={r.id} className="glass-lite animate-rise flex flex-col gap-3 rounded-[1.75rem] p-5" style={{ "--i": i } as CSSProperties}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-bold">{r.author_name}</span>
                    <span className="text-sm text-muted">
                      על{" "}
                      {r.business && (
                        <Link href={`/b/${r.business.public_id}`} target="_blank" className="font-medium text-foreground hover:underline">
                          {r.business.name}
                        </Link>
                      )}{" "}
                      · {formatRelative(r.created_at)}
                    </span>
                    {r.status === "hidden" && <Badge tone="warning">מוסתרת</Badge>}
                    {r.status === "removed" && <Badge tone="danger">הוסרה</Badge>}
                    {open.length > 0 && <Badge tone="danger">{open.length} דיווחים</Badge>}
                  </div>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{r.body}</p>
                  {r.reply && <p className="rounded-xl bg-[var(--glass-bg)] p-3 text-sm text-muted">תגובת העסק: {r.reply}</p>}
                  {open.length > 0 && (
                    <ul className="flex flex-col gap-1 text-sm">
                      {open.map((x, j) => (
                        <li key={j} className="flex flex-wrap gap-1.5 text-muted">
                          <Flag className="mt-0.5 size-3.5 text-danger" />
                          <span className="font-medium text-foreground">{REPORT_REASONS[x.reason]}</span>
                          {x.note && <span>— {x.note}</span>}
                          <span>· {formatRelative(x.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.status_reason && <p className="text-xs text-muted">סיבה: {r.status_reason}</p>}
                  <ReviewModeration id={r.id} status={r.status} hasReports={open.length > 0} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
