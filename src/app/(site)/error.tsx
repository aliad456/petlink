"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button, Card } from "@/components/ui";

// Shown under the header when a page fails to load (e.g. the database is briefly unreachable).
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <Card className="flex w-full flex-col items-center gap-3 p-8 text-center">
        <p className="text-xl font-bold">משהו השתבש בטעינה</p>
        <p className="text-sm text-muted">זה קורה לפעמים. נסו שוב — ברוב המקרים זה מסתדר מיד.</p>
        <Button onClick={reset} className="mt-2">
          <RefreshCw className="size-4" />
          לנסות שוב
        </Button>
      </Card>
    </main>
  );
}
