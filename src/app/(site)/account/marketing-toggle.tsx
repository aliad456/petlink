"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "@/components/toast";
import { Switch } from "@/components/ui";
import { setMarketingConsent } from "./actions";

export function MarketingToggle({ consent }: { consent: boolean }) {
  const [value, setValue] = useOptimistic(consent);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">עדכונים והטבות במייל</span>
        <span className="text-sm text-muted">טיפים, עסקים חדשים ומבצעים. אפשר לבטל בכל רגע.</span>
      </div>
      <Switch
        checked={value}
        label="עדכונים והטבות במייל"
        onChange={(next) =>
          startTransition(async () => {
            setValue(next);
            const r = await setMarketingConsent(next);
            if (r.error) toast.error(r.error);
            else toast.success(next ? "נרשמת לעדכונים" : "הוסרת מרשימת התפוצה");
          })
        }
      />
    </div>
  );
}
