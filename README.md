# Kami

> לשעבר PetLink. שם הריפו נשאר `petlink`.

מדריך לכל השירותים לחיות מחמד בישראל: וטרינרים, מאלפים, ספרים, חנויות וימי אימוץ.

- אפיון: [`docs/SPEC.md`](docs/SPEC.md)
- החלטת סטאק: [`docs/STACK.md`](docs/STACK.md)

**סטאק:** Next.js 16 · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage) · Vercel

## הרצה מקומית

דרוש: Node 20 ומעלה, ו-Docker (בשביל Supabase מקומי).

```bash
npm install
npm run db:start          # מרים Supabase מקומי ומריץ את ה-migrations
cp .env.example .env.local
# מעתיקים ל-.env.local את Publishable key ואת Secret key שהפקודה הקודמת הדפיסה
npm run dev               # http://localhost:3000
```

מיילים (אישור הרשמה, איפוס סיסמה) נשלחים בסביבה המקומית ל-Mailpit: http://127.0.0.1:54324

## הגדרת הבעלים (פעם אחת)

1. נרשמים באתר עם המייל של הבעלים.
2. ב-Supabase → SQL Editor (או `psql` מקומי):
   ```sql
   select public.bootstrap_owner('owner@example.com');
   ```
3. נכנסים ל-`/admin`, סורקים את קוד ה-QR באפליקציית אימות (Google Authenticator וכו') ומזינים את הקוד.

אפשר להריץ את הפונקציה רק מה-SQL Editor, כלומר לא מתוך האפליקציה. יכול להיות רק בעלים אחד.

## מבנה ההרשאות

| מי | מה |
|---|---|
| **בעלים** | הכול. רק הבעלים יכול למחוק לצמיתות, לנהל מנהלים והרשאות ולראות הכנסות |
| **עובד** | רק ההרשאות שסומנו לו (טבלת `staff_permissions`) |
| **תפקיד מוכן** | תבנית שממלאת את תיבות הסימון: שירות לקוחות, מנהל תוכן, פרסום |

- ההרשאות נאכפות **במסד הנתונים** (RLS + `has_permission()`), לא רק בממשק.
- אין הרשאות בלי אימות דו-שלבי: עד שעובד מאמת את הסשן בקוד (aal2), `has_permission()` מחזירה false.
- עובד חסום או נעול מאבד את הגישה מיד.
- כל פעולת מנהל נרשמת ב-`audit_log` (מי, מה, מתי), ואי אפשר לערוך או למחוק את היומן.

## עדכון מסד הנתונים בסביבה החיה

כל קובץ חדש ב-`supabase/migrations/` צריך לרוץ פעם אחת ב-Supabase → SQL Editor, לפי סדר השמות.
(או `npx supabase db push` אחרי `supabase link`.)

## העלאה לאוויר (כשמגיעים לשם)

1. פותחים פרויקט ב-[Supabase](https://supabase.com), באזור `eu-central-1`.
2. `npx supabase link --project-ref <ref>` ואז `npx supabase db push`.
3. ב-Supabase → Authentication:
   - URL Configuration: מגדירים Site URL = `https://petlink.co.il` ומוסיפים את `https://petlink.co.il/auth/callback` ל-Redirect URLs.
   - Multi-Factor: מפעילים TOTP.
   - SMTP: מחברים ספק מייל (למשל Resend). ה-SMTP המובנה מוגבל לכמה מיילים בשעה.
4. מחברים את הריפו ל-[Vercel](https://vercel.com) ומגדירים את משתני הסביבה מ-`.env.example`.

## מפת הדרכים

- [x] **שלב 1 — תשתית:** מסד נתונים, התחברות, מבנה הרשאות, 2FA למנהלים, יומן פעולות, קטגוריות ופילטרים
- [x] עיצוב Liquid Glass ומעברי עמודים
- [ ] שלב 2 — פאנל אדמין בסיסי: ~~משתמשים~~ ✓, ~~קטגוריות ופילטרים~~ ✓, ~~עסקים~~ ✓, הרשאות (מצב מלא ב-`docs/ROADMAP.md`)
- [x] שלב 3 — עמוד עסק ורישום עסקים (PRO: בקרוב)
- [ ] שלב 4 — חיפוש ופילטרים לצד המשתמש
- [ ] שלב 5 — ביקורות ודיווחים
- [ ] שלב 6 — מנויים וסליקה
- [ ] שלב 7 — עורך AI לעמודים
- [ ] שלב 8 — באנרים, ימי אימוץ ודשבורד
