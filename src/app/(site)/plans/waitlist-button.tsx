"use client";

import { BadgeCheck, BellRing } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { joinProWaitlist } from "@/app/business/actions";

// Business owners: be told first when the plans launch (same list as the editor's PRO window).
export function WaitlistButton({ joined, label, primary }: { joined: boolean; label: string; primary?: boolean }) {
  const [done, setDone] = useState(joined);
  const [pending, startTransition] = useTransition();
  if (done) {
    return (
      <p className="flex h-11 items-center justify-center gap-1.5 text-sm font-semibold text-success">
        <BadgeCheck className="size-5" />
        אתם ברשימה. נעדכן ראשונים.
      </p>
    );
  }
  return (
    <Button
      type="button"
      variant={primary ? "primary" : "glass"}
      loading={pending}
      className="w-full"
      onClick={() =>
        startTransition(async () => {
          const r = await joinProWaitlist();
          if (r.error) toast.error(r.error);
          else {
            setDone(true);
            toast.success("מעולה! נעדכן אתכם ראשונים כשהתוכניות יושקו.");
          }
        })
      }
    >
      <BellRing className="size-4" />
      {label}
    </Button>
  );
}
