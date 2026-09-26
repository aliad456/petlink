// Hebrew labels for audit_log actions (written by public.log_admin_action in the migrations).
// Unknown actions fall back to the raw key, so a new action never breaks the log.

export const AUDIT_GROUPS = [
  { key: "business", label: "עסקים" },
  { key: "user", label: "משתמשים" },
  { key: "review", label: "ביקורות" },
  { key: "ads", label: "מודעות" },
  { key: "catalog", label: "קטגוריות" },
  { key: "contact", label: "פניות" },
] as const;

export type AuditGroup = (typeof AUDIT_GROUPS)[number]["key"];

// action prefixes per group (catalog = categories + filters)
export const GROUP_PREFIXES: Record<AuditGroup, string[]> = {
  business: ["business."],
  user: ["user.", "owner."],
  review: ["review."],
  ads: ["ads."],
  catalog: ["category.", "filter."],
  contact: ["contact."],
};

const LABELS: Record<string, string> = {
  "owner.bootstrap": "הוגדר בעלים לאתר",
  "business.approved": "אישר עסק",
  "business.suspended": "השהה עסק",
  "business.removed": "הסיר עסק",
  "business.draft": "החזיר עסק לטיוטה",
  "business.pending": "החזיר עסק להמתנה",
  "business.feature": "סימן עסק כמומלץ",
  "business.unfeature": "הסיר עסק מהמומלצים",
  "business.create_unclaimed": "יצר עמוד לא מנוהל",
  "business.update_unclaimed": "ערך עמוד לא מנוהל",
  "business.update_unclaimed_details": "עדכן שעות ומאפיינים",
  "business.import_unclaimed": "ייבא עסקים מטבלה",
  "business.claim_approved": "אישר בקשת בעלות",
  "business.claim_rejected": "דחה בקשת בעלות",
  "business.removal_approved": "אישר בקשת הסרה",
  "business.removal_rejected": "דחה בקשת הסרה",
  "user.lock": "נעל משתמש",
  "user.unlock": "שחרר נעילה",
  "user.block": "חסם משתמש",
  "user.unblock": "ביטל חסימה",
  "user.delete": "מחק משתמש",
  "user.restore": "שחזר משתמש",
  "user.delete_permanent": "מחק משתמש לצמיתות",
  "user.reset_password": "שלח איפוס סיסמה",
  "user.message": "שלח הודעה למשתמש",
  "review.keep": "השאיר ביקורת מדווחת",
  "review.remove": "הסיר ביקורת",
  "ads.create": "יצר מודעה",
  "ads.update": "ערך מודעה",
  "ads.delete": "מחק מודעה",
  "ads.placement": "עדכן הגדרות מיקום",
  "ads.weekday_rule": "עדכן יום שמור קבוע",
  "ads.date_rule": "עדכן תאריך שמור",
  "category.create": "יצר קטגוריה",
  "category.update": "ערך קטגוריה",
  "category.hide": "הסתיר קטגוריה",
  "category.show": "הציג קטגוריה",
  "category.reorder": "שינה סדר קטגוריות",
  "category.emergency": "עדכן כפתור חירום",
  "category.adoption": "עדכן קטגוריית ימי אימוץ",
  "filter.create": "יצר פילטר",
  "filter.update": "ערך פילטר",
  "filter.hide": "הסתיר פילטר",
  "filter.show": "הציג פילטר",
  "filter.reorder": "שינה סדר פילטרים",
};

export function auditLabel(action: string) {
  if (LABELS[action]) return LABELS[action];
  if (action === "contact.handled") return "סימן פנייה כטופלה";
  if (action === "contact.new") return "החזיר פנייה לחדשות";
  if (action.startsWith("contact.")) return "עדכן סטטוס פנייה";
  return action;
}

export function auditGroup(action: string): AuditGroup | null {
  for (const [group, prefixes] of Object.entries(GROUP_PREFIXES) as [AuditGroup, string[]][]) {
    if (prefixes.some((p) => action.startsWith(p))) return group;
  }
  return null;
}

// A short human summary of the details object (name, reason, counts…).
export function auditSummary(details: Record<string, unknown>): string[] {
  const out: string[] = [];
  const str = (k: string) => (typeof details[k] === "string" && details[k] ? String(details[k]) : null);
  const name = str("name") ?? str("advertiser") ?? str("label");
  if (name) out.push(name);
  if (typeof details.count === "number") out.push(`${details.count} עסקים`);
  if (typeof details.value === "boolean") out.push(details.value ? "הופעל" : "כובה");
  const reason = str("reason") ?? str("note");
  if (reason) out.push(`סיבה: ${reason}`);
  return out;
}
