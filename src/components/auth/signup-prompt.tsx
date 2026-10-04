"use client";

import { LogIn, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@/components/dialog";
import { buttonClass } from "@/components/ui";
import { loginHref, signupHref, type SignupSource } from "@/lib/signup";
import { GoogleButton } from "./google-button";

const PERKS = [
  "תזכורת לפני כל חיסון, במייל ובטלפון",
  "העסקים ששמרתם, תמיד בהישג יד",
  "קביעת תורים וביקורות",
];

// Shown to guests when they try something that needs an account (saving a business,
// writing a review, …): what they get, then Google / email sign-up / sign-in. After
// signing up they land on `next`, which finishes what they started.
//
// Portaled and wrapped: triggers may sit inside card links, and clicks in the dialog
// must not bubble up to them (React events follow the React tree).
export function SignupPrompt({
  open,
  onClose,
  title,
  description,
  next,
  source,
  signupLabel = "הרשמה בחינם",
  signupIcon = <UserPlus className="size-4" />,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  next: string;
  source: SignupSource;
  signupLabel?: string;
  signupIcon?: ReactNode;
}) {
  if (!open) return null;
  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={open} onClose={onClose} title={title} description={description}>
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2 text-sm">
            {PERKS.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-brand" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2">
            <GoogleButton next={next} source={source} />
            <Link href={signupHref(next, source)} className={buttonClass({ className: "w-full" })}>
              {signupIcon}
              {signupLabel}
            </Link>
            <Link href={loginHref(next)} className={buttonClass({ variant: "glass", className: "w-full" })}>
              <LogIn className="size-4" />
              כבר יש לי חשבון
            </Link>
          </div>
        </div>
      </Dialog>
    </div>,
    document.body,
  );
}
