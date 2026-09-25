// Operator details shown in the legal pages. Values in [brackets] are
// placeholders the owner must fill in before launch (see docs/ROADMAP.md).
//
// TERMS_VERSION is stored on every new profile (profiles.terms_version) as
// proof of consent. Bump it whenever the terms or privacy policy change
// materially, and update LEGAL_UPDATED.

export const TERMS_VERSION = "2026-09-25";
export const LEGAL_UPDATED = "25 בספטמבר 2026";

export const OPERATOR = {
  // שם המפעיל כפי שהוא רשום (עוסק מורשה / חברה בע"מ)
  legalName: "א.ב פתרונות",
  // עוסק מורשה: מספר העוסק הוא ת.ז., ולכן לא מפורסם באתר (אין חובה באתר חינמי).
  // כשתהיה מכירה לצרכנים, חוק הגנת הצרכן (ס' 14ג) מחייב למסור אותו לפני העסקה.
  registrationId: null as string | null,
  // כתובת למשלוח דואר (לא חובה כרגע)
  address: null as string | null,
  email: "[support@kami.co.il]",
  privacyEmail: "[privacy@kami.co.il]",
  accessibility: {
    name: "[שם רכז/ת הנגישות]",
    email: "[accessibility@kami.co.il]",
    phone: "[מספר טלפון]",
  },
  // בית המשפט המוסמך
  jurisdiction: "תל אביב-יפו",
};

export const LEGAL_LINKS = [
  { href: "/terms", label: "תנאי שימוש" },
  { href: "/privacy", label: "מדיניות פרטיות" },
  { href: "/business-terms", label: "תנאים לבעלי עסקים" },
  { href: "/accessibility", label: "הצהרת נגישות" },
  { href: "/contact", label: "צור קשר" },
] as const;
