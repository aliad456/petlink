"use client";

import { useActionState } from "react";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import type { Profile } from "@/lib/auth/session";
import { updateProfile, type ProfileFormState } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Label>
        שם מלא
        <Input name="full_name" defaultValue={profile.full_name} required />
      </Label>
      <Label>
        טלפון
        <Input
          name="phone"
          type="tel"
          dir="ltr"
          autoComplete="tel"
          defaultValue={profile.phone ?? ""}
        />
      </Label>
      <FormMessage {...state} />
      <Button type="submit" disabled={pending} className="self-start">
        שמירה
      </Button>
    </form>
  );
}
