import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireStaff } from "@/lib/auth/session";
import { NAV_ITEMS } from "./nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await requireStaff();

  const items = NAV_ITEMS.filter((item) =>
    item.anyOf === null
      ? staff.isOwner
      : staff.isOwner ||
        item.anyOf.length === 0 ||
        item.anyOf.some((p) => staff.permissions.has(p)),
  );

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-border bg-card md:w-60 md:border-b-0 md:border-l">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="text-xl font-extrabold text-brand">
            PetLink <span className="text-sm font-medium text-muted">ניהול</span>
          </Link>
          <SignOutButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {items.map((item) =>
            item.soon ? (
              <span
                key={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted"
              >
                {item.label} <span className="text-xs">(בקרוב)</span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium hover:bg-background"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
