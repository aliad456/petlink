import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { FormMessage } from "@/components/ui";
import { OPERATOR } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

// Public page Google Play links to as the app's account-deletion resource.
export const metadata: Metadata = { title: "מחיקת חשבון" };

const link = "font-medium text-brand-strong underline underline-offset-2 dark:text-brand";

const sections: LegalSection[] = [
  {
    id: "how",
    title: "איך מבקשים למחוק את החשבון",
    body: (
      <ol>
        <li>
          נכנסים ל-
          <Link href="/account" className={link}>
            החשבון שלי
          </Link>{" "}
          באתר או באפליקציית {SITE_NAME}, ובחלק &quot;התראות ופרטיות&quot; לוחצים על &quot;מחיקת החשבון&quot;. אחרי
          אישור, החשבון נמחק מיד.
        </li>
        <li>
          או, בלי להתחבר: שולחים בקשה דרך{" "}
          <Link href="/contact?kind=privacy&topic=delete" className={link}>
            טופס יצירת הקשר
          </Link>{" "}
          או במייל ל-<span dir="ltr">{OPERATOR.privacyEmail}</span>, מהכתובת שאיתה נרשמתם.
        </li>
        <li>בבקשה בטופס או במייל: נאמת שהיא הגיעה מבעל/ת החשבון, ונאשר במייל כשהמחיקה הושלמה.</li>
      </ol>
    ),
  },
  {
    id: "deleted",
    title: "מה נמחק",
    body: (
      <ul>
        <li>פרטי החשבון: שם, מייל, טלפון וסיסמה.</li>
        <li>חיות המחמד שלך, התמונות שלהן וקישורי השיתוף.</li>
        <li>העסקים ששמרת והביקורות שכתבת.</li>
        <li>עמוד העסק שלך והתמונות שבו (לבעלי עסקים).</li>
      </ul>
    ),
  },
  {
    id: "kept",
    title: "מה נשמר, ולכמה זמן",
    body: (
      <ul>
        <li>
          מחיקה מתוך החשבון מתבצעת מיד; בקשה בטופס או במייל תוך 30 יום. מהגיבויים המידע נמחק תוך 90 יום נוספים.
        </li>
        <li>
          תיעוד הסכמה לתנאים, בקשות בעלות על עסקים ויומן פעולות ניהול נשמרים עד 7 שנים, כנדרש להגנה מפני טענות משפטיות.
        </li>
        <li>סטטיסטיקת ביקורים אינה מזהה אותך ונמחקת אחרי 12 חודשים.</li>
      </ul>
    ),
  },
];

export default async function DeleteAccountPage({ searchParams }: PageProps<"/delete-account">) {
  const { done } = await searchParams;
  return (
    <LegalPage
      title="מחיקת חשבון"
      intro={
        <>
          {done === "1" && (
            <div className="mb-4">
              <FormMessage message="החשבון שלך נמחק. תודה שהיית איתנו!" />
            </div>
          )}
          <p>
            כך מוחקים חשבון ב-{SITE_NAME} (האתר www.heykami.co.il ואפליקציות {SITE_NAME} ל-Android ול-iPhone), שמופעל
            על ידי {OPERATOR.legalName}. פרטים נוספים ב
            <Link href="/privacy" className={link}>
              מדיניות הפרטיות
            </Link>
            .
          </p>
        </>
      }
      sections={sections}
    />
  );
}
