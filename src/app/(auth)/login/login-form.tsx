"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { signIn, type FormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Label>
        מייל
        <Input
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={state.fields?.email}
          required
        />
      </Label>
      <Label>
        סיסמה
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          required
        />
      </Label>
      <FormMessage error={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "מתחבר…" : "התחברות"}
      </Button>
      <Link href="/forgot-password" className="text-center text-sm text-muted underline">
        שכחתי סיסמה
      </Link>
    </form>
  );
}
