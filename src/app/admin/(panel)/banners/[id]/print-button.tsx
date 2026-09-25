"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="glass" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      הדפסה / PDF
    </Button>
  );
}
