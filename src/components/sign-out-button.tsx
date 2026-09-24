import { LogOut } from "lucide-react";
import { buttonClass } from "./ui";

export function SignOutButton({ compact }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        aria-label={compact ? "התנתקות" : undefined}
        className={buttonClass({ variant: "ghost", size: compact ? "icon" : "sm" })}
      >
        <LogOut className="size-4" />
        {!compact && "התנתקות"}
      </button>
    </form>
  );
}
