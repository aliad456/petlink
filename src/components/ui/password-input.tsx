"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "./cn";
import { Input } from "./form";

// A password field with an eye button to show / hide what was typed. Password fields
// are LTR (dir="ltr"), so the eye sits on the physical right, after the text.
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative block">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
        aria-pressed={shown}
        title={shown ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
        className="focus-ring absolute inset-y-0 right-1.5 my-auto inline-flex size-9 items-center justify-center rounded-xl text-muted hover:text-foreground"
      >
        {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </span>
  );
}
