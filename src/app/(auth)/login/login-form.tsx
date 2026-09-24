"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import { signIn, type FormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});

  return (
    <form action={action} className="flex flex-col gap-5">
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
        <span className="flex items-center justify-between">
          סיסמה
          <Link
            href="/forgot-password"
            transitionTypes={["nav-forward"]}
            className="text-xs font-medium text-muted hover:text-brand"
          >
            שכחתי סיסמה
          </Link>
        </span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          required
        />
      </Label>
      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        התחברות
      </Button>
    </form>
  );
}
