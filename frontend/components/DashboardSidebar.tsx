"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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

function NavLinks({ items, pathname, onNavigate }: { items: typeof NAV_ITEMS; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="mt-8 space-y-1 lg:mt-10">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? "bg-mist/10 text-mist" : "text-mist/60 hover:bg-mist/5 hover:text-mist"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="border-t border-mist/10 pt-4">
      <p className="truncate text-xs text-mist/60">{userEmail ?? "Signed in"}</p>
      <form action={signOutAction} className="mt-2">
        <button type="submit" className="text-xs font-medium text-signal hover:underline">
          Sign out
        </button>
      </form>
    </div>
  );
}

export function DashboardSidebar({
  userEmail,
  role,
}: {
  userEmail: string | null;
  role: "government" | "lga_official" | "ward_official" | null;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navItems = role === "government" ? [...NAV_ITEMS, ...GOVERNMENT_ONLY_NAV_ITEMS] : NAV_ITEMS;

  // Close the mobile menu automatically whenever the route changes.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/10 bg-ink px-4 py-3 text-mist lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
          AquaWatch
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-mist transition hover:bg-mist/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile slide-in menu */}
      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setIsMobileOpen(false)} />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col justify-between bg-ink px-5 py-6 text-mist">
            <div>
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2 font-display text-lg font-semibold"
                  onClick={() => setIsMobileOpen(false)}
                >
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
                  AquaWatch
                </Link>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full p-1.5 text-mist/70 transition hover:bg-mist/10 hover:text-mist"
                >
                  ✕
                </button>
              </div>
              <NavLinks items={navItems} pathname={pathname} onNavigate={() => setIsMobileOpen(false)} />
            </div>
            <AccountFooter userEmail={userEmail} />
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col justify-between border-r border-ink/10 bg-ink px-5 py-6 text-mist lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
            AquaWatch
          </Link>
          <NavLinks items={navItems} pathname={pathname} />
        </div>
        <AccountFooter userEmail={userEmail} />
      </aside>
    </>
  );
}
