"use client";

import { MailCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { resendVerifyLink } from "@/app/(auth)/actions";
import { toast } from "@/components/toast";
import { Button, cn } from "@/components/ui";

// For accounts whose address isn't confirmed yet (profiles.email_verified_at):
// everything works except writing reviews, until the link in the email is clicked.
export function VerifyEmailNotice({
  email,
  reason = "כדי לכתוב ביקורות ולקבל תזכורות במייל",
  className,
}: {
  email: string | null;
  reason?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] p-4 sm:flex-row sm:items-center",
        className,
      )}
    >
      <MailCheck className="size-6 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">נשאר לאשר את המייל</p>
        <p className="text-muted">
          לחצו על הקישור ששלחנו {reason}:
          <span dir="ltr" className="block font-medium text-foreground">{email}</span>
        </p>
      </div>
      <Button
        size="sm"
        variant="glass"
        loading={pending}
        disabled={sent}
        onClick={() =>
          start(async () => {
            const r = await resendVerifyLink();
            if (r.error) toast.error(r.error);
            else {
              setSent(true);
              toast.success(r.ok!);
            }
          })
        }
      >
        {sent ? "נשלח" : "שליחה שוב"}
      </Button>
    </div>
  );
}
