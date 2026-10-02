// Kami's paid plans for businesses (pet owners use Kami free). Shown on /plans.
// Draft: prices and contents are not final until the owner launches billing
// (see docs/SPEC.md, "תוכניות לעסקים").

export type Plan = {
  key: "pet" | "zoo" | "safari";
  name: string;
  audience: string;
  price: number | null; // ₪ per month; null = quote on request
  intro?: string; // launch offer shown under the price
  highlight?: string; // badge on the recommended plan
  features: string[];
  cta: { label: string; href?: string; waitlist?: boolean };
};

export const PLANS: Plan[] = [
  {
    key: "pet",
    name: "KamiPet Business",
    audience: "לעסק אחד",
    price: 39.9,
    intro: "3 החודשים הראשונים ב-19.90 ₪",
    features: [
      "עדיפות בתוצאות החיפוש ותג KamiPet",
      "זימון תורים אונליין מהעמוד שלכם",
      "עיצובים מתקדמים לעמוד העסק",
      "סטטיסטיקות: צפיות, חיוגים, וואטסאפ וניווט",
      "גלישה בלי פרסומות (מלבד באנרים)",
    ],
    cta: { label: "עדכנו אותי בהשקה", waitlist: true },
  },
  {
    key: "zoo",
    name: "KamiZoo",
    audience: "עד 3 עסקים",
    price: 99.9,
    highlight: "הכי משתלם",
    features: [
      "כל מה שב-KamiPet Business, לשלושה עסקים",
      "יום פרסום אחד בחודש באתר, במתנה (בכפוף למקום פנוי)",
      "סטטיסטיקות לכל עסק בנפרד",
      "גלישה בלי פרסומות (מלבד באנרים)",
    ],
    cta: { label: "עדכנו אותי בהשקה", waitlist: true },
  },
  {
    key: "safari",
    name: "KamiSafari",
    audience: "לרשתות ולסניפים",
    price: null,
    features: [
      "עמוד נפרד לכל סניף, בכל עיר",
      "סטטיסטיקות לכל סניף ולכל הרשת",
      "פרסום קבוע באתר (לפי בחירה)",
      "איש קשר אישי ב-Kami",
    ],
    cta: { label: "לקבלת הצעת מחיר", href: "/contact?topic=safari" },
  },
];

export const FOUNDERS_NOTE = "מצטרפים בחודשים הראשונים? המחיר שלכם נשאר קבוע, גם כשהמחירים יעלו.";
