import {
  BadgeCheck,
  Bot,
  CircleHelp,
  Eye,
  FileSearch,
  Gift,
  Lock,
  Mail,
  PencilLine,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";
import { buttonClass, Card, Input } from "@/components/ui";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "העסק שלך כבר ב-Kami?",
  description:
    "Kami מוסיפה עסקים לחיות מחמד מתוך מידע עסקי ציבורי. כל בעל עסק יכול לקבל את ניהול העמוד שלו בחינם, או לבקש להסיר אותו.",
};

// Explains unclaimed pages (owner_id is null: created by staff from public info)
// and lets a business find its page, then ask to manage it or to remove it.
// Both go through the existing claim flow (/claim/[publicId]), which staff
// verify by hand (admin_review_claim).

type Hit = { public_id: number; name: string; city: string | null; category: { name: string } | null };

async function findUnclaimed(q: string): Promise<Hit[]> {
  // PostgREST filter syntax: keep only letters, digits, spaces and a few marks.
  const term = q.replace(/[^\p{L}\p{N}\s'"״׳-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (term.length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("public_id, name, city, category:categories(name)")
    .eq("status", "approved")
    .is("owner_id", null)
    .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
    .order("name")
    .limit(20)
    .returns<Hit[]>();
  return data ?? [];
}

export default async function UnclaimedPage({ searchParams }: PageProps<"/unclaimed">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [hits, profile] = await Promise.all([q ? findUnclaimed(q) : [], getCurrentProfile()]);
  // Same links as the notice on an unclaimed business page (/b/[publicId]).
  const claimHref = (id: number) =>
    profile ? `/claim/${id}` : `/signup?type=business&next=${encodeURIComponent(`/claim/${id}`)}`;
  const removalHref = (id: number) =>
    profile
      ? `/claim/${id}?kind=removal`
      : `/contact?kind=business&topic=removal&page=${encodeURIComponent(`/b/${id}`)}`;

  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-8 sm:pt-12">
        <header className="animate-rise flex flex-col items-center gap-3 text-center">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-brand-strong dark:text-brand">
            <BadgeCheck className="size-3.5" />
            לבעלי עסקים
          </span>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">העסק שלך כבר ב-Kami?</h1>
          <p className="max-w-xl text-balance text-muted">
            אנחנו מוסיפים ל-Kami עסקים לחיות מחמד מכל הארץ, כדי שבעלי כלבים וחתולים ימצאו את כל השירותים במקום אחד. אם
            מצאתם כאן את העסק שלכם, אפשר לקבל את ניהול העמוד <strong className="text-foreground">בחינם</strong>, או לבקש
            שנסיר אותו. הכול בכמה דקות.
          </p>
        </header>

        {/* חיפוש העסק */}
        <Card id="find" className="animate-rise flex scroll-mt-24 flex-col gap-4 p-5 sm:p-7" style={{ "--i": 1 } as CSSProperties}>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Search className="size-5 text-brand" />
            מצאו את העסק שלכם
          </h2>
          <form action="/unclaimed#find" className="flex gap-2">
            <Input
              name="q"
              defaultValue={q}
              placeholder="שם העסק או העיר"
              aria-label="שם העסק או העיר"
              maxLength={60}
              className="flex-1"
            />
            <button type="submit" className={buttonClass({ className: "shrink-0" })}>
              חיפוש
            </button>
          </form>

          {q && (
            <div className="flex flex-col gap-2.5">
              {hits.length === 0 ? (
                <p className="rounded-2xl bg-[var(--glass-bg)] p-4 text-sm text-muted">
                  לא מצאנו עמוד לא מנוהל בשם הזה. אולי העסק עוד לא נוסף, או שכבר יש לו בעלים. אפשר{" "}
                  <Link href="/signup?type=business" className="font-semibold text-brand-strong underline underline-offset-2 dark:text-brand">
                    לפתוח עמוד עסק חדש בחינם
                  </Link>{" "}
                  או{" "}
                  <Link href="/contact" className="font-semibold text-brand-strong underline underline-offset-2 dark:text-brand">
                    לכתוב לנו
                  </Link>
                  .
                </p>
              ) : (
                hits.map((b) => (
                  <div key={b.public_id} className="glass-lite flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <Link href={`/b/${b.public_id}`} className="block truncate font-bold hover:underline">
                        {b.name}
                      </Link>
                      <span className="text-sm text-muted">
                        {[b.category?.name, b.city].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={claimHref(b.public_id)} className={buttonClass({ size: "sm" })}>
                        <BadgeCheck className="size-4" />
                        לנהל בחינם
                      </Link>
                      <Link href={removalHref(b.public_id)} className={buttonClass({ size: "sm", variant: "glass" })}>
                        <Trash2 className="size-4" />
                        להסיר
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <p className="text-xs text-muted">
            אפשר גם להיכנס לעמוד העסק עצמו: בעמודים לא מנוהלים יש כפתור &quot;העסק שלך? קבל גישה מלאה&quot;.
          </p>
        </Card>

        {/* שלושה צעדים */}
        <ol className="animate-rise grid gap-3 sm:grid-cols-3" style={{ "--i": 2 } as CSSProperties}>
          <Step n={1} icon={FileSearch} title="מוצאים את העסק">
            מחפשים בשם או בעיר, ונכנסים לעמוד.
          </Step>
          <Step n={2} icon={UserCheck} title="שולחים בקשה">
            ניהול או הסרה. לוקח פחות מדקה.
          </Step>
          <Step n={3} icon={ShieldCheck} title="אנחנו מאמתים">
            בדיקה ידנית, ותשובה תוך כמה ימי עסקים.
          </Step>
        </ol>

        <Section id="what" icon={Eye} title="מה זה עמוד לא מנוהל?" i={3}>
          <p>
            Kami הוא מדריך לשירותים לחיות מחמד בישראל: וטרינרים, ספרים לכלבים, מאלפים, חנויות מזון וציוד, עמותות וימי
            אימוץ. רוב העסקים נרשמים אלינו בעצמם ומנהלים את העמוד שלהם. כדי שבעלי חיות ימצאו כבר היום תמונה מלאה של מה
            שיש באזור שלהם, אנחנו מוסיפים גם עסקים שעוד לא הצטרפו. לעמודים האלה אנחנו קוראים <strong>עמודים לא מנוהלים</strong>.
          </p>
          <p>
            עמוד לא מנוהל הוא עמוד בסיסי: שם העסק, התחום, העיר, ולפעמים גם כתובת, טלפון, אתר ושעות פעילות. אין בו תמונות
            של העסק, אין בו מבצעים, ואין בו שום דבר שבעל העסק לא פרסם בעצמו לציבור. העמוד שייך לעסק, ולכן הדרך היחידה
            להוסיף לו תוכן היא שבעל העסק יקבל את הניהול.
          </p>
          <p>
            עמוד כזה מסומן באתר כ<strong>&quot;עסק שלא אומת&quot;</strong>, כדי שכל מי שנכנס יידע שהפרטים לא נמסרו על ידי בעל
            העסק עצמו ושכדאי לוודא אותם לפני שמגיעים. הופעת עסק ב-Kami לא אומרת שיש בינינו קשר עסקי, ולא מהווה המלצה שלנו.
          </p>
        </Section>

        <Section id="how" icon={Bot} title="איך עסקים מגיעים ל-Kami?" i={4}>
          <p>
            אנחנו מוסיפים עסקים חדשים באופן שוטף, כמעט כל יום. את העבודה עושים בעזרת <strong>כלי בינה מלאכותית (AI)</strong>{" "}
            שעוזרים לנו לאתר עסקים לחיות מחמד בכל הארץ, לאסוף את הפרטים העסקיים שהם פרסמו בפומבי, ולסדר אותם בצורה אחידה:
            שם, תחום, עיר, כתובת, טלפון, אתר ושעות.
          </p>
          <p>
            הבינה המלאכותית היא רק כלי עזר. לפני שעסק עולה לאתר, צוות Kami עובר על הפרטים, מסמן מה צריך לבדוק, ומוריד
            עסקים שהמידע עליהם לא ברור מספיק. ככה האתר גדל מהר, ועדיין יש עין אנושית על כל עמוד.
          </p>
          <p>
            המטרה פשוטה: כשבעל כלב מחפש &quot;וטרינר פתוח עכשיו&quot; או &quot;ספר לכלבים בחיפה&quot;, שיקבל תשובה אמיתית ושימושית,
            גם אם העסק עוד לא הספיק להצטרף.
          </p>
        </Section>

        <Section id="sources" icon={FileSearch} title="מאיפה המידע, ומה בדיוק מפורסם?" i={5}>
          <p>
            אנחנו משתמשים רק במידע <strong>עסקי</strong> שהעסק עצמו פרסם לציבור: באתר של העסק, בעמודי עסקים ברשתות, ובאינדקסים
            ומדריכי עסקים פומביים. אלה פרטים שכל לקוח יכול למצוא בחיפוש פשוט ברשת.
          </p>
          <ul>
            <li>
              <strong>מה כן מופיע:</strong> שם העסק, התחום, העיר והכתובת, טלפון העסק, אתר העסק, שעות פעילות ותיאור קצר
              כשיש.
            </li>
            <li>
              <strong>מה לא מופיע:</strong> מידע אישי שלא פורסם כמידע עסקי, תמונות של העסק, ביקורות שלא נכתבו באתר על ידי
              משתמשים אמיתיים, ומחירים.
            </li>
            <li>
              <strong>מספרי טלפון:</strong> לפעמים מופיע מספר שמנתב דרך אינדקס עסקים (למשל 072 או 077). כשבעל העסק מקבל את
              הניהול, הוא יכול להחליף אותו במספר הישיר.
            </li>
          </ul>
          <p>
            את כל הפרטים על איסוף ושימוש במידע אפשר לקרוא ב
            <Link href="/terms">תנאי השימוש</Link> וב<Link href="/privacy">מדיניות הפרטיות</Link>.
          </p>
        </Section>

        <Section id="claim" icon={Gift} title="לקבל את ניהול העמוד, בחינם" i={6}>
          <p>
            כל עסק שמופיע ב-Kami יכול לקבל את ניהול העמוד שלו <strong>בלי לשלם כלום</strong>. עמוד עסק ב-Kami חינמי, ויישאר
            חינמי.
          </p>
          <ol>
            <li>
              פותחים <Link href="/signup?type=business">חשבון של בעל/ת עסק</Link> (או נכנסים לחשבון קיים).
            </li>
            <li>
              מוצאים את העסק בחיפוש למעלה ולוחצים <strong>&quot;לנהל בחינם&quot;</strong>, או נכנסים לעמוד העסק ולוחצים &quot;העסק
              שלך? קבל גישה מלאה&quot;.
            </li>
            <li>ממלאים שם מלא, התפקיד שלכם בעסק וטלפון לחזרה, ושולחים.</li>
            <li>
              הצוות שלנו בודק את הבקשה <strong>ידנית</strong>, כדי לוודא שאתם באמת מהעסק ולהגן עליו מהתחזות. בדרך כלל זה
              לוקח כמה ימי עסקים, ולפעמים נחזור אליכם בטלפון.
            </li>
            <li>אחרי האישור העמוד עובר אליכם, והסימון &quot;עסק שלא אומת&quot; יורד.</li>
          </ol>
          <p>עד שהבקשה מאושרת, שום דבר בעמוד לא משתנה.</p>
        </Section>

        <Section id="after" icon={PencilLine} title="מה אפשר לעשות כשהעמוד אצלכם?" i={7}>
          <ul>
            <li>לעדכן ולתקן את כל הפרטים: שם, כתובת, טלפון, וואטסאפ, אתר ושעות פעילות, כולל ימי שישי, שבת וחגים.</li>
            <li>להעלות לוגו, תמונת רקע וגלריה של העסק ושל העבודות שלכם.</li>
            <li>לכתוב על העסק, לבחור עיצוב לעמוד, ולסמן מה מיוחד אצלכם (למשל &quot;מגיע לבית הלקוח&quot; או &quot;עובד בשבת&quot;).</li>
            <li>לפרסם מבצעים ולהופיע בעמוד המבצעים של Kami.</li>
            <li>לקבל פניות ישירות בוואטסאפ ובטלפון, בלי עמלות ובלי מתווכים.</li>
          </ul>
          <p>
            מי שרוצה עוד, כמו עדיפות בתוצאות החיפוש, זימון תורים אונליין וסטטיסטיקות, יכול לבחור בעתיד באחת{" "}
            <Link href="/plans">התוכניות לעסקים</Link>. זה תמיד בחירה, אף פעם לא תנאי.
          </p>
        </Section>

        <Section id="removal" icon={Trash2} title="לא רוצים להופיע? אפשר להסיר" i={8}>
          <p>
            אם אתם לא רוצים שהעסק שלכם יופיע ב-Kami, זו זכותכם המלאה ואנחנו נכבד אותה. מוצאים את העסק בחיפוש למעלה ולוחצים{" "}
            <strong>&quot;להסיר&quot;</strong>. מי שמחובר שולח בקשה מכל סוג חשבון, וגם בלי חשבון אפשר: הכפתור
            מוביל לטופס פנייה קצר.
          </p>
          <p>
            גם בקשת הסרה נבדקת ידנית, כדי שאף אחד לא יוכל להוריד עסק של מישהו אחר. אחרי האישור העמוד יורד מהאתר ולא מופיע
            בחיפוש. אם תתחרטו, תמיד אפשר לחזור ולפתוח עמוד מחדש.
          </p>
          <p>
            מעדיפים לא לפתוח חשבון? כתבו לנו דרך <Link href="/contact">עמוד צור קשר</Link> או למייל{" "}
            <a href="mailto:info@heykami.co.il" dir="ltr">info@heykami.co.il</a>, עם שם העסק והעיר, ונטפל בזה.
          </p>
        </Section>

        <Section id="wrong" icon={CircleHelp} title="מצאתם מידע שגוי?" i={9}>
          <p>
            המידע בעמודים לא מנוהלים נאסף ממקורות פומביים, ולפעמים הוא לא מעודכן: עסק שעבר כתובת, שינה שעות או סגר. אם אתם
            בעלי העסק, הדרך הכי מהירה היא לקבל את הניהול ולתקן בעצמכם. אם אתם לקוחות ששמו לב לטעות, נשמח לשמוע{" "}
            <Link href="/contact">בעמוד צור קשר</Link>, ונעדכן.
          </p>
        </Section>

        <Section id="privacy" icon={Lock} title="פרטיות ואבטחה" i={10}>
          <p>
            הפרטים שאתם שולחים בבקשה (שם, תפקיד וטלפון) משמשים רק כדי לאמת שאתם מהעסק ולחזור אליכם. הם לא מתפרסמים
            באתר ולא נמסרים לאף אחד. כל פעולה של הצוות על עמודי עסקים נרשמת ביומן פנימי שאי אפשר למחוק.
          </p>
          <p>
            לפרטים מלאים: <Link href="/privacy">מדיניות הפרטיות</Link>, <Link href="/terms">תנאי השימוש</Link> ו
            <Link href="/business-terms">התנאים לבעלי עסקים</Link>.
          </p>
        </Section>

        {/* שאלות נפוצות */}
        <Card className="animate-rise flex flex-col gap-3 p-5 sm:p-7" style={{ "--i": 11 } as CSSProperties}>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles className="size-5 text-brand" />
            שאלות נפוצות
          </h2>
          <Faq q="זה באמת בחינם?">
            כן. גם קבלת הניהול וגם עמוד העסק עצמו חינמיים. אין דמי הרשמה, אין עמלה על לקוחות, ואין התחייבות. תוכניות בתשלום
            הן תוספת אופציונלית בלבד.
          </Faq>
          <Faq q="למה העסק שלי מופיע בלי שביקשתי?">
            כי אנחנו רוצים שבעלי חיות ימצאו את כל השירותים באזור שלהם, כולל עסקים שעוד לא הצטרפו. אנחנו מפרסמים רק פרטים
            עסקיים שהעסק כבר פרסם לציבור, מסמנים את העמוד כלא מאומת, ונותנים לכם שליטה מלאה: לנהל או להסיר.
          </Faq>
          <Faq q="מי מוסיף את העסקים? זה רובוט?">
            גם וגם. כלי בינה מלאכותית עוזרים לנו לאתר עסקים ולסדר את הפרטים הציבוריים שלהם, וצוות Kami עובר על המידע
            לפני שהוא עולה לאתר.
          </Faq>
          <Faq q="כמה זמן לוקח לקבל את הניהול?">
            בדרך כלל כמה ימי עסקים. כל בקשה נבדקת ידנית, ולפעמים נתקשר לוודא שאתם מהעסק. נעדכן אתכם כשהבקשה מאושרת.
          </Faq>
          <Faq q="מה אם מישהו אחר ינסה לקחת את העמוד שלי?">
            בגלל זה כל בקשה נבדקת ידנית. עמוד עובר לניהול רק אחרי שווידאנו שהמבקש באמת מהעסק. אם קיבלתם הודעה חשודה או
            שמשהו נראה לא בסדר, כתבו לנו מיד.
          </Faq>
          <Faq q="ביקשתי הסרה. העסק יחזור לאתר?">
            אנחנו מכבדים את הבקשה: העמוד מסומן אצלנו כהוסר לבקשת בעל העסק, ולא נעלה אותו מחדש. אם תרצו לחזור בעתיד, תוכלו
            לפתוח עמוד בעצמכם.
          </Faq>
          <Faq q="יש לי כמה סניפים או כמה עסקים">
            כרגע כל חשבון מנהל עסק אחד. לרשתות ולסניפים מתוכננת <Link href="/plans">תוכנית ייעודית</Link>, ועד אז כתבו לנו
            ונמצא פתרון.
          </Faq>
          <Faq q="לא מצאתי את העסק שלי בחיפוש">
            אולי הוא עוד לא נוסף, או שהוא כבר מנוהל. אפשר <Link href="/signup?type=business">לפתוח עמוד עסק חדש</Link> בכמה
            דקות, בחינם.
          </Faq>
        </Card>

        <div className="animate-rise flex flex-col items-center gap-3 text-center" style={{ "--i": 12 } as CSSProperties}>
          <p className="text-muted">יש שאלה שלא מופיעה כאן?</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="#find" className={buttonClass()}>
              <Search className="size-4" />
              לחפש את העסק שלי
            </Link>
            <Link href="/contact" className={buttonClass({ variant: "glass" })}>
              <Mail className="size-4" />
              לכתוב לנו
            </Link>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Search; title: string; children: ReactNode }) {
  return (
    <li className="glass-lite flex flex-col gap-2 rounded-3xl p-5">
      <span className="flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-kami text-sm font-extrabold text-white">{n}</span>
        <Icon className="size-5 text-brand" />
      </span>
      <b className="font-extrabold">{title}</b>
      <span className="text-sm text-muted">{children}</span>
    </li>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  i,
  children,
}: {
  id: string;
  icon: typeof Search;
  title: string;
  i: number;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="glass-lite animate-rise scroll-mt-24 rounded-3xl p-5 text-[15px] leading-relaxed sm:p-7"
      style={{ "--i": i } as CSSProperties}
    >
      <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--brand)_14%,transparent)] text-brand-strong dark:text-brand">
          <Icon className="size-5" />
        </span>
        {title}
      </h2>
      <div className="legal-prose flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-[var(--glass-bg)] px-4 py-3">
      <summary className="cursor-pointer list-none font-bold marker:hidden">
        <span className="me-2 inline-block text-brand transition-transform group-open:rotate-90">‹</span>
        {q}
      </summary>
      <div className="legal-prose mt-2 text-[15px] leading-relaxed text-muted">{children}</div>
    </details>
  );
}
