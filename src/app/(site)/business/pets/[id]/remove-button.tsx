"use client";

import { useTransition } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui";
import { removeSharedPet } from "../actions";

export function RemoveSharedPet({ petId }: { petId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="glass"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await removeSharedPet(petId);
          if (r?.error) toast.error(r.error);
        })
      }
    >
      הסרה מהרשימה שלי
    </Button>
  );
}
