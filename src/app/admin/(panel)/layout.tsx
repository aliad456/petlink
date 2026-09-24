import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireStaff } from "@/lib/auth/session";
import { AdminNav } from "./admin-nav";
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
    <div className="flex flex-1 flex-col gap-3 p-3 md:flex-row md:gap-5 md:p-5">
      <aside
        style={{ viewTransitionName: "app-chrome" }}
        className="glass sticky top-3 z-40 flex shrink-0 flex-col rounded-[1.75rem] md:top-5 md:h-[calc(100dvh-2.5rem)] md:w-64"
      >
        <div className="flex items-center justify-between p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Logo href="/admin" />
            <span className="rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[11px] font-semibold text-muted">
              ניהול
            </span>
          </div>
          <div className="md:hidden">
            <SignOutButton compact />
          </div>
        </div>
        <AdminNav items={items} />
        <div className="mt-auto hidden border-t border-border p-3 md:block">
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-1 py-2 md:px-4 md:py-4">{children}</main>
    </div>
  );
}
