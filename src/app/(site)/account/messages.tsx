"use client";

import { Mail } from "lucide-react";
import { useEffect } from "react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { markMessagesRead } from "./actions";

export type Message = {
  id: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export function Messages({ messages }: { messages: Message[] }) {
  const hasUnread = messages.some((m) => !m.read_at);

  // Seeing the list counts as reading it. The "new" badges stay until next visit.
  useEffect(() => {
    if (hasUnread) void markMessagesRead();
  }, [hasUnread]);

  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle>הודעות מ-Kami</SectionTitle>
      <ul className="flex flex-col gap-3">
        {messages.map((m) => (
          <li key={m.id} className="rounded-2xl bg-[var(--glass-bg)] p-4">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-brand" />
              <h3 className="font-semibold">{m.subject}</h3>
              {!m.read_at && <Badge tone="brand">חדש</Badge>}
              <time className="ms-auto text-xs text-muted" dateTime={m.created_at}>
                {formatDateTime(m.created_at)}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
              {m.body}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
