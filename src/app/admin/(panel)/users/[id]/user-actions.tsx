"use client";

import {
  Ban,
  KeyRound,
  Lock,
  LockOpen,
  MessageSquare,
  RotateCcw,
  ShieldOff,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Dialog } from "@/components/dialog";
import { toast } from "@/components/toast";
import { Button, cn, FormMessage, Input, Label, Textarea } from "@/components/ui";
import type { AccountStatus } from "@/lib/auth/session";
import {
  deleteUserPermanently,
  restoreUser,
  sendMessage,
  sendPasswordReset,
  setUserStatus,
  softDeleteUser,
  type ActionResult,
} from "./actions";

type DialogKind =
  | "lock"
  | "unlock"
  | "block"
  | "unblock"
  | "reset"
  | "message"
  | "delete"
  | "restore"
  | "purge";

export type ActionPermissions = {
  lock: boolean;
  block: boolean;
  reset: boolean;
  message: boolean;
  delete: boolean;
  owner: boolean;
};

export function UserActions({
  user,
  can,
}: {
  user: {
    id: string;
    name: string;
    email: string | null;
    status: AccountStatus;
    deleted: boolean;
    manageable: boolean;
  };
  can: ActionPermissions;
}) {
  const [open, setOpen] = useState<DialogKind | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const close = () => {
    setOpen(null);
    setError(undefined);
  };

  const run = (action: () => Promise<ActionResult>) => {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.ok) toast.success(result.ok);
      close();
    });
  };

  const m = user.manageable;
  const buttons: {
    kind: DialogKind;
    label: string;
    icon: LucideIcon;
    show: boolean;
    tone?: "danger";
  }[] = [
    { kind: "message", label: "שליחת הודעה", icon: MessageSquare, show: m && can.message && !user.deleted },
    { kind: "reset", label: "איפוס סיסמה", icon: KeyRound, show: m && can.reset && !user.deleted },
    { kind: "lock", label: "נעילה", icon: Lock, show: m && can.lock && user.status === "active" && !user.deleted },
    { kind: "unlock", label: "שחרור נעילה", icon: LockOpen, show: m && can.lock && user.status === "locked" },
    { kind: "block", label: "חסימה", icon: Ban, show: m && can.block && user.status !== "blocked" && !user.deleted, tone: "danger" },
    { kind: "unblock", label: "ביטול חסימה", icon: ShieldOff, show: m && can.block && user.status === "blocked" },
    { kind: "delete", label: "מחיקה", icon: Trash2, show: m && can.delete && !user.deleted, tone: "danger" },
    { kind: "restore", label: "שחזור", icon: RotateCcw, show: m && can.owner && user.deleted },
    { kind: "purge", label: "מחיקה לצמיתות", icon: Trash2, show: m && can.owner, tone: "danger" },
  ];
  const visible = buttons.filter((b) => b.show);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted">
        {m ? "אין לך הרשאות לפעולות על המשתמש הזה." : "אי אפשר לבצע פעולות על המשתמש הזה (בעלים, צוות או החשבון שלך)."}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {visible.map(({ kind, label, icon: Icon, tone }) => (
          <Button
            key={kind}
            type="button"
            variant={tone === "danger" ? "danger" : "glass"}
            onClick={() => setOpen(kind)}
            className="h-auto flex-col gap-2 whitespace-normal rounded-3xl py-4"
          >
            <Icon className="size-5" />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>

      {/* נעילה / חסימה — עם סיבה */}
      {(["lock", "block"] as const).map((kind) => (
        <ReasonDialog
          key={kind}
          open={open === kind}
          onClose={close}
          title={kind === "lock" ? `נעילת ${user.name}` : `חסימת ${user.name}`}
          description={
            kind === "lock"
              ? "המשתמש לא יוכל להתחבר עד שתשחררו את הנעילה. מתאים לבקשת המשתמש או לחשד לפריצה."
              : "המשתמש לא יוכל להתחבר. מתאים להפרת תנאי השימוש."
          }
          confirmLabel={kind === "lock" ? "נעילה" : "חסימה"}
          danger={kind === "block"}
          pending={pending}
          error={error}
          onConfirm={(reason) =>
            run(() => setUserStatus(user.id, kind === "lock" ? "locked" : "blocked", reason))
          }
        />
      ))}

      {/* שחרור / ביטול חסימה / איפוס / שחזור — אישור פשוט */}
      <ConfirmDialog
        open={open === "unlock" || open === "unblock"}
        onClose={close}
        title={open === "unblock" ? "ביטול החסימה" : "שחרור הנעילה"}
        description={`${user.name} יוכל להתחבר שוב.`}
        confirmLabel="אישור"
        pending={pending}
        error={error}
        onConfirm={() => run(() => setUserStatus(user.id, "active"))}
      />
      <ConfirmDialog
        open={open === "reset"}
        onClose={close}
        title="איפוס סיסמה"
        description={
          <>
            יישלח מייל עם קישור לבחירת סיסמה חדשה אל{" "}
            <span dir="ltr" className="font-semibold text-foreground">
              {user.email}
            </span>
          </>
        }
        confirmLabel="שליחת מייל"
        pending={pending}
        error={error}
        onConfirm={() => run(() => sendPasswordReset(user.id))}
      />
      <ConfirmDialog
        open={open === "restore"}
        onClose={close}
        title="שחזור משתמש"
        description={`${user.name} יחזור לרשימה ויוכל להתחבר (אם החשבון לא נעול או חסום).`}
        confirmLabel="שחזור"
        pending={pending}
        error={error}
        onConfirm={() => run(() => restoreUser(user.id))}
      />

      <ReasonDialog
        open={open === "delete"}
        onClose={close}
        title={`מחיקת ${user.name}`}
        description="המשתמש יוסתר מהרשימה ולא יוכל להתחבר. הנתונים נשמרים, והבעלים יכול לשחזר."
        confirmLabel="מחיקה"
        reasonOptional
        danger
        pending={pending}
        error={error}
        onConfirm={(reason) => run(() => softDeleteUser(user.id, reason))}
      />

      <MessageDialog
        open={open === "message"}
        onClose={close}
        name={user.name}
        pending={pending}
        error={error}
        onSend={(subject, body) => run(() => sendMessage(user.id, { subject, body }))}
      />

      <PurgeDialog
        open={open === "purge"}
        onClose={close}
        email={user.email ?? ""}
        pending={pending}
        error={error}
        onConfirm={(typed) => run(() => deleteUserPermanently(user.id, typed))}
      />
    </>
  );
}

// Form state that resets each time its dialog opens (React's "adjust state
// during render" pattern, instead of an effect).
function useResetOnOpen<T>(open: boolean, initial: T) {
  const [value, setValue] = useState(initial);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setValue(initial);
  }
  return [value, setValue] as const;
}

function DialogFooter({
  pending,
  onClose,
  confirmLabel,
  danger,
  disabled,
}: {
  pending: boolean;
  onClose: () => void;
  confirmLabel: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-row-reverse gap-2.5">
      <Button
        type="submit"
        variant={danger ? "danger" : "primary"}
        loading={pending}
        disabled={disabled}
        className="flex-1"
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="glass" onClick={onClose} className="flex-1">
        ביטול
      </Button>
    </div>
  );
}

function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pending: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <FormMessage error={error} />
        <DialogFooter pending={pending} onClose={onClose} confirmLabel={confirmLabel} />
      </form>
    </Dialog>
  );
}

function ReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  reasonOptional,
  danger,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  reasonOptional?: boolean;
  danger?: boolean;
  pending: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useResetOnOpen(open, "");
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(reason);
        }}
      >
        <Label>
          {reasonOptional ? "סיבה (לא חובה)" : "סיבה"}
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required={!reasonOptional}
            maxLength={500}
            placeholder="נשמר ביומן הפעולות"
            className="min-h-20"
            autoFocus
          />
        </Label>
        <FormMessage error={error} />
        <DialogFooter pending={pending} onClose={onClose} confirmLabel={confirmLabel} danger={danger} />
      </form>
    </Dialog>
  );
}

function MessageDialog({
  open,
  onClose,
  name,
  pending,
  error,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  pending: boolean;
  error?: string;
  onSend: (subject: string, body: string) => void;
}) {
  const [subject, setSubject] = useResetOnOpen(open, "");
  const [body, setBody] = useResetOnOpen(open, "");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`הודעה ל${name}`}
      description='ההודעה תופיע בעמוד "החשבון שלי" של המשתמש.'
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(subject, body);
        }}
      >
        <Label>
          כותרת
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required autoFocus />
        </Label>
        <Label>
          תוכן
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required />
        </Label>
        <FormMessage error={error} />
        <DialogFooter pending={pending} onClose={onClose} confirmLabel="שליחה" />
      </form>
    </Dialog>
  );
}

function PurgeDialog({
  open,
  onClose,
  email,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  pending: boolean;
  error?: string;
  onConfirm: (typed: string) => void;
}) {
  const [typed, setTyped] = useResetOnOpen(open, "");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="מחיקה לצמיתות"
      description="החשבון וכל הנתונים שלו יימחקו ואי אפשר יהיה לשחזר אותם. הפעולה נרשמת ביומן."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(typed);
        }}
      >
        <Label>
          <span>
            להקליד את המייל לאישור:{" "}
            <span dir="ltr" className="font-semibold">
              {email}
            </span>
          </span>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            dir="ltr"
            autoComplete="off"
            className={cn(matches && "!border-[color-mix(in_oklab,var(--danger)_50%,transparent)]")}
          />
        </Label>
        <FormMessage error={error} />
        <DialogFooter
          pending={pending}
          onClose={onClose}
          confirmLabel="מחיקה לצמיתות"
          danger
          disabled={!matches}
        />
      </form>
    </Dialog>
  );
}
