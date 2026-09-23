import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  // Staff see the item if they hold any of these. null = owner only.
  anyOf: Permission[] | null;
  // Not built yet: shown greyed out so the panel's shape is visible.
  soon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "ראשי", anyOf: [] },
  { href: "/admin/users", label: "משתמשים", anyOf: ["users.view"], soon: true },
  { href: "/admin/businesses", label: "עסקים", anyOf: ["businesses.view"], soon: true },
  { href: "/admin/reviews", label: "ביקורות", anyOf: ["reviews.moderate"], soon: true },
  { href: "/admin/catalog", label: "קטגוריות ופילטרים", anyOf: ["catalog.manage"], soon: true },
  { href: "/admin/adoption", label: "ימי אימוץ", anyOf: ["adoption.manage"], soon: true },
  { href: "/admin/banners", label: "באנרים", anyOf: ["banners.manage", "banners.reports"], soon: true },
  { href: "/admin/billing", label: "מנויים ותשלומים", anyOf: ["subscriptions.view", "coupons.manage"], soon: true },
  { href: "/admin/audit", label: "יומן פעולות", anyOf: ["audit.view"], soon: true },
  { href: "/admin/staff", label: "מנהלים והרשאות", anyOf: null, soon: true },
];
