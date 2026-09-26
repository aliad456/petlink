import type { Permission } from "@/lib/auth/permissions";

export type NavIcon =
  | "home"
  | "users"
  | "store"
  | "star"
  | "tags"
  | "heart"
  | "megaphone"
  | "wallet"
  | "history"
  | "shield"
  | "claim"
  | "inbox";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  // Staff see the item if they hold any of these. [] = everyone, null = owner only.
  anyOf: Permission[] | null;
  // Not built yet: shown greyed out so the panel's shape is visible.
  soon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "ראשי", icon: "home", anyOf: [] },
  { href: "/admin/users", label: "משתמשים", icon: "users", anyOf: ["users.view"] },
  { href: "/admin/businesses", label: "עסקים", icon: "store", anyOf: ["businesses.view"] },
  { href: "/admin/claims", label: "בקשות בעלות", icon: "claim", anyOf: ["businesses.approve"] },
  { href: "/admin/inbox", label: "פניות", icon: "inbox", anyOf: ["inbox.manage"] },
  { href: "/admin/reviews", label: "ביקורות", icon: "star", anyOf: ["reviews.moderate"] },
  { href: "/admin/catalog", label: "קטגוריות ופילטרים", icon: "tags", anyOf: ["catalog.manage"] },
  // Adoption-day posters are ads in the "adoption" placement: a shortcut into the ads calendar.
  { href: "/admin/banners?p=adoption", label: "ימי אימוץ", icon: "heart", anyOf: ["banners.manage", "banners.reports"] },
  { href: "/admin/banners", label: "מודעות", icon: "megaphone", anyOf: ["banners.manage", "banners.reports"] },
  { href: "/admin/billing", label: "מנויים ותשלומים", icon: "wallet", anyOf: ["subscriptions.view", "coupons.manage"], soon: true },
  { href: "/admin/audit", label: "יומן פעולות", icon: "history", anyOf: ["audit.view"] },
  { href: "/admin/staff", label: "מנהלים והרשאות", icon: "shield", anyOf: null, soon: true },
];
