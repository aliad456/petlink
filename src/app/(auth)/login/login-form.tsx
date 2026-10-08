"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, FormMessage, Input, Label, PasswordInput } from "@/components/ui";
import { signIn, type FormState } from "../actions";
import { LockDialog } from "./lock-dialog";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  // Reopen the lock dialog on every new answer (React's "adjust state during render").
  const [shown, setShown] = useState<FormState>(state);
  const [lockOpen, setLockOpen] = useState(false);
  if (state !== shown) {
    setShown(state);
    setLockOpen(Boolean(state.lock));
  }

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
        <PasswordInput
          name="password"
          autoComplete="current-password"
          dir="ltr"
          required
        />
      </Label>
      <FormMessage error={state.error} />
      {state.lock && <LockDialog lock={state.lock} open={lockOpen} onClose={() => setLockOpen(false)} />}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        התחברות
      </Button>
    </form>
  );
}
