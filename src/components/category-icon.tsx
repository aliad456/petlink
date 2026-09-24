import { createElement } from "react";
import { categoryIcon } from "@/lib/category-icons";

// Category icons are stored as names in the database (editable from admin).
// Unknown names fall back to a paw.
export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  return createElement(categoryIcon(name), { className });
}
