"use client";

import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { LiveNow } from "@/lib/stats";
import { fetchLiveNow } from "./actions";

const REFRESH_MS = 15_000;

export function LiveNowCard({ initial }: { initial: LiveNow | null }) {
  const [live, setLive] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const next = await fetchLiveNow().catch(() => null);
      if (alive && next) setLive(next);
    };
    const id = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const total = live?.total ?? 0;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <span className="relative inline-flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative size-2.5 rounded-full bg-success" />
          </span>
          עכשיו באתר
        </h2>
        <span className="text-xs text-muted">מתעדכן כל 15 שניות</span>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <div className="text-5xl font-extrabold tabular-nums leading-none">{total}</div>
          <div className="mt-1 text-sm text-muted">מבקרים ב-5 הדקות האחרונות</div>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-muted">מחוברים</dt>
            <dd className="text-2xl font-bold tabular-nums">{live?.members ?? 0}</dd>
          </div>
          <div>
            <dt className="text-muted">אורחים</dt>
            <dd className="text-2xl font-bold tabular-nums">{live?.guests ?? 0}</dd>
          </div>
        </dl>
      </div>

      {live && live.pages.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
          {live.pages.map((p) => (
            <li key={p.path} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <Radio className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span dir="ltr" className="truncate">
                  {p.path}
                </span>
              </span>
              <span className="tabular-nums text-muted">{p.n}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
