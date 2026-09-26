// Operator details shown in the legal pages.
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
  // One inbox for everything (info@ forwards to the owner's mailbox).
  email: "info@heykami.co.il",
  privacyEmail: "info@heykami.co.il",
  accessibility: {
    name: "אליעד ביטון",
    email: "info@heykami.co.il",
    // Not published for now; the accessibility statement points to the contact form instead.
    phone: null as string | null,
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
