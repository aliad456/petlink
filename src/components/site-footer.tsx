import Link from "next/link";
import { LEGAL_LINKS, OPERATOR } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";
import { BetaTag } from "./beta";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-[var(--border)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 text-sm text-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LogoMark size={22} />
            <span className="font-bold text-foreground">{SITE_NAME}</span>
            <BetaTag />
          </div>
          <nav aria-label="מידע משפטי" className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="focus-ring rounded hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="text-xs leading-relaxed">
          האתר בגרסת בטא (הרצה) ומסופק &quot;כמות שהוא&quot;. {SITE_NAME} הוא מדריך בלבד: המידע על העסקים מגיע
          מבעלי העסקים או ממקורות ציבוריים, ואיננו צד להתקשרות ביניכם לבין העסק. במקרה חירום רפואי לחיית
          המחמד פנו ישירות לווטרינר.
        </p>
        <p className="text-xs">
          © {new Date().getFullYear()} {OPERATOR.legalName}. כל הזכויות שמורות.
        </p>
      </div>
    </footer>
  );
}
