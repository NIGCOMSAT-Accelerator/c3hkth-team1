import Link from "next/link";

export function SiteNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-mist">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
          AquaWatch
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-mist/80 md:flex">
          <a href="#how-it-works" className="transition hover:text-mist">
            How it works
          </a>
          <a href="#impact" className="transition hover:text-mist">
            Impact
          </a>
          <Link href="/login" className="transition hover:text-mist">
            Sign in
          </Link>
        </nav>

        <Link
          href="/signup"
          className="rounded-full bg-signal px-4 py-2 text-sm font-medium text-ink transition hover:bg-signal-soft"
        >
          Request access
        </Link>
      </div>
    </header>
  );
}
