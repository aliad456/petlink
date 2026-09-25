"use client";

import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { setContactStatus } from "./actions";

export function StatusButton({ id, handled }: { id: string; handled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={handled ? "glass" : "primary"}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await setContactStatus(id, handled ? "new" : "handled");
          if (r.error) toast.error(r.error);
        })
      }
    >
      {handled ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
      {handled ? "החזרה לפתוחות" : "סימון כטופל"}
    </Button>
  );
}
