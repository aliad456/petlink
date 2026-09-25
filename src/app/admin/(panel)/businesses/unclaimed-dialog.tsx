"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { CITIES } from "@/lib/business/cities";
import { saveUnclaimedBusiness, type UnclaimedState } from "./actions";

export type UnclaimedInitial = {
  id: string;
  name: string;
  category_id: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  bio: string | null;
};

const SELECT =
  "glass focus-ring h-12 w-full rounded-2xl px-4 text-base text-foreground";

// Staff create a page for a real business from public info only. It goes live
// at once, marked "not managed", until the owner claims it.
export function UnclaimedBusinessButton({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: UnclaimedInitial;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <>
      {initial ? (
        <Button size="sm" variant="glass" onClick={() => setOpen(true)}>
          <Pencil className="size-4" />
          עריכה
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          הוספת עסק
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setKey((k) => k + 1);
        }}
        title={initial ? `עריכת עמוד: ${initial.name}` : "הוספת עסק קיים"}
        description="רק מידע ציבורי (שם, עיר, טלפון, אתר). העמוד יסומן כ״לא מנוהל״ עד שבעל העסק יבקש בעלות ותאשרו."
      >
        <UnclaimedForm key={key} categories={categories} initial={initial} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function UnclaimedForm({
  categories,
  initial,
  onDone,
}: {
  categories: { id: string; name: string }[];
  initial?: UnclaimedInitial;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<UnclaimedState, FormData>(saveUnclaimedBusiness, {});
  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      onDone();
    }
  }, [state, onDone]);

  const f = state.fields ?? {
    name: initial?.name ?? "",
    category_id: initial?.category_id ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? "",
    website: initial?.website ?? "",
    bio: initial?.bio ?? "",
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <Label>
        שם העסק
        <Input name="name" defaultValue={f.name} maxLength={60} required autoFocus />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          תחום
          <select name="category_id" defaultValue={f.category_id} required className={SELECT}>
            <option value="" disabled>
              בחירה…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Label>
        <Label>
          עיר
          <Input name="city" list="admin-cities" defaultValue={f.city} maxLength={60} required />
          <datalist id="admin-cities">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Label>
      </div>
      <Label>
        כתובת (לא חובה)
        <Input name="address" defaultValue={f.address} maxLength={120} />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label>
          טלפון
          <Input name="phone" type="tel" dir="ltr" defaultValue={f.phone} placeholder="03-0000000" />
        </Label>
        <Label>
          וואטסאפ (לא חובה)
          <Input name="whatsapp" type="tel" dir="ltr" defaultValue={f.whatsapp} placeholder="050-0000000" />
        </Label>
      </div>
      <Label>
        אתר (לא חובה)
        <Input name="website" dir="ltr" defaultValue={f.website} maxLength={200} placeholder="https://" />
      </Label>
      <Label>
        תיאור קצר (לא חובה, עובדתי בלבד)
        <Textarea name="bio" defaultValue={f.bio} maxLength={1500} className="min-h-20" />
      </Label>
      <FormMessage error={state.error} />
      <Button type="submit" loading={pending}>
        {initial ? "שמירה" : "יצירת העמוד"}
      </Button>
    </form>
  );
}
