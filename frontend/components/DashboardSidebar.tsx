"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/lib/auth-actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/wards", label: "Ward risk" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/guide", label: "Guide" },
];

const GOVERNMENT_ONLY_NAV_ITEMS = [{ href: "/dashboard/audit-log", label: "Audit log" }];

export function DashboardSidebar({
  userEmail,
  role,
}: {
  userEmail: string | null;
  role: "government" | "lga_official" | "ward_official" | null;
}) {
  const pathname = usePathname();
  const navItems = role === "government" ? [...NAV_ITEMS, ...GOVERNMENT_ONLY_NAV_ITEMS] : NAV_ITEMS;

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col justify-between border-r border-ink/10 bg-ink px-5 py-6 text-mist lg:flex">
      <div>
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
          AquaWatch
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-mist/10 text-mist" : "text-mist/60 hover:bg-mist/5 hover:text-mist"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-mist/10 pt-4">
        <p className="truncate text-xs text-mist/60">{userEmail ?? "Signed in"}</p>
        <form action={signOutAction} className="mt-2">
          <button type="submit" className="text-xs font-medium text-signal hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
