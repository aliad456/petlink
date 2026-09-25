"use client";

import { useActionState } from "react";
import { Button, ChoiceTile, FormMessage, Input, Label } from "@/components/ui";
import { SPECIES, type Species } from "@/lib/pets";
import { createPet, type CreatePetState } from "../actions";

export function NewPetForm() {
  const [state, action, pending] = useActionState<CreatePetState, FormData>(createPet, {});
  return (
    <form action={action} className="flex flex-col gap-6">
      <Label>
        איך קוראים לה/לו?
        <Input name="name" defaultValue={state.fields?.name} maxLength={40} placeholder="למשל: בוני" required autoFocus />
      </Label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">מי זה?</legend>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(SPECIES) as Species[]).map((s) => (
            <ChoiceTile
              key={s}
              type="radio"
              name="species"
              value={s}
              required
              defaultChecked={(state.fields?.species ?? "dog") === s}
              className="flex-col gap-1 px-1 py-3"
            >
              <span className="text-2xl" aria-hidden>
                {SPECIES[s].emoji}
              </span>
              <span className="text-xs leading-tight">{SPECIES[s].label}</span>
            </ChoiceTile>
          ))}
        </div>
      </fieldset>
      <FormMessage error={state.error} />
      <Button type="submit" size="lg" loading={pending}>
        המשך
      </Button>
    </form>
  );
}
