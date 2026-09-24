import {
  Dog,
  Heart,
  PawPrint,
  Scissors,
  Stethoscope,
  Store,
  type LucideIcon,
} from "lucide-react";

// Category icons are stored as names in the database (editable from admin).
// Unknown names fall back to a paw.
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  dog: Dog,
  store: Store,
  scissors: Scissors,
  heart: Heart,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || PawPrint;
  return <Icon className={className} />;
}
