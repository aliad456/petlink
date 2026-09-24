"use client";

import { useActionState, useEffect } from "react";
import { toast } from "@/components/toast";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import type { Profile } from "@/lib/auth/session";
import { updateProfile, type ProfileFormState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {},
  );

  useEffect(() => {
    if (state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Label>
          שם מלא
          <Input name="full_name" defaultValue={profile.full_name} autoComplete="name" required />
        </Label>
        <Label>
          טלפון
          <Input
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel"
            placeholder="050-0000000"
            defaultValue={profile.phone ?? ""}
          />
        </Label>
      </div>
      <FormMessage error={state.error} />
      <Button type="submit" loading={pending} className="self-start">
        שמירת שינויים
      </Button>
    </form>
  );
}
