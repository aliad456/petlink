"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, Input } from "@/components/ui";
import { DELETE_ACCOUNT_WORD } from "@/lib/account";
import { deleteMyAccount, unblockAll } from "./actions";

export function DeleteAccountButton({ isBusiness }: { isBusiness: boolean }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <Button variant="glass" size="sm" className="self-start text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        מחיקת החשבון
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="למחוק את החשבון?"
        description={
          isBusiness
            ? "החשבון, עמוד העסק, התמונות והביקורות שכתבת יימחקו לצמיתות. אי אפשר לשחזר."
            : "החשבון, חיות המחמד, העסקים ששמרת והביקורות שכתבת יימחקו לצמיתות. אי אפשר לשחזר."
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await deleteMyAccount(word);
              if (r?.error) toast.error(r.error);
            });
          }}
        >
          <label className="flex flex-col gap-2 text-sm">
            כדי לאשר, כתבו &quot;{DELETE_ACCOUNT_WORD}&quot;:
            <Input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />
          </label>
          <div className="flex flex-row-reverse gap-2.5">
            <Button
              type="submit"
              variant="danger"
              className="flex-1"
              loading={pending}
              disabled={word.trim() !== DELETE_ACCOUNT_WORD}
            >
              מחיקה לצמיתות
            </Button>
            <Button type="button" variant="glass" className="flex-1" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function BlockedUsers({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      חסמת {count === 1 ? "משתמש אחד" : `${count} משתמשים`}, והביקורות שלהם מוסתרות אצלך.
      <button
        type="button"
        disabled={pending}
        className="focus-ring font-medium text-brand-strong underline underline-offset-2 disabled:opacity-50 dark:text-brand"
        onClick={() =>
          start(async () => {
            const r = await unblockAll();
            if (r.error) toast.error(r.error);
            else toast.success("החסימות בוטלו");
          })
        }
      >
        ביטול החסימות
      </button>
    </p>
  );
}
