import { createElement } from "react";
import { categoryIcon } from "@/lib/category-icons";

// Category icons are stored as names in the database (editable from admin).
// Unknown names fall back to a paw.
export function CategoryIcon({ name, className, strokeWidth }: { name: string | null; className?: string; strokeWidth?: number }) {
  return createElement(categoryIcon(name), { className, strokeWidth });
}
