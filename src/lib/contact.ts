// Topics for the contact form and the admin inbox (contact_requests.kind).
export const CONTACT_KINDS = {
  general: "שאלה כללית",
  business: "בעלי עסקים",
  report: "דיווח על תוכן או עמוד",
  privacy: "פרטיות ומידע אישי",
  accessibility: "נגישות",
} as const;

export type ContactKind = keyof typeof CONTACT_KINDS;
