"use client";

import { Construction, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "@/components/toast";
import { Badge, Card, Switch } from "@/components/ui";
import { setPageMaintenance } from "./actions";

export type MaintenancePage = { path: string; label: string; href: string; closed: boolean };

// Close a page to visitors while fixing it ("בקרוב חוזרים"); staff still see it.
export function MaintenanceList({ groups }: { groups: { title: string; pages: MaintenancePage[] }[] }) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="flex gap-3 text-sm">
        <Construction className="mt-0.5 size-5 shrink-0 text-orange-500" />
        <p className="text-muted">
          דף במצב תחזוקה מציג לגולשים מסך &quot;בקרוב חוזרים&quot;. אתם (ומי שיש לו הרשאת מצב תחזוקה) ממשיכים לראות את הדף
          האמיתי, עם פס כתום שמזכיר שהוא סגור. כל שינוי נרשם ביומן הפעולות.
        </p>
      </Card>
      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-muted">{g.title}</h2>
          <ul className="flex flex-col gap-2">
            {g.pages.map((p) => (
              <Row key={p.path} page={p} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ page }: { page: MaintenancePage }) {
  const [pending, startTransition] = useTransition();
  const [closed, setClosed] = useOptimistic(page.closed);
  const toggle = (value: boolean) =>
    startTransition(async () => {
      setClosed(value);
      const r = await setPageMaintenance(page.path, value);
      if (r.error) toast.error(r.error);
      else if (r.ok) toast.success(r.ok);
    });

  return (
    <li className="glass-lite flex items-center gap-3 rounded-2xl px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 font-semibold">
          {page.label}
          {closed && <Badge tone="warning">בתחזוקה</Badge>}
        </span>
        <Link href={page.href} target="_blank" className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand" dir="ltr">
          {page.path}
          <ExternalLink className="size-3" />
        </Link>
      </div>
      <Switch checked={closed} onChange={toggle} disabled={pending} label={`מצב תחזוקה: ${page.label}`} />
    </li>
  );
}
