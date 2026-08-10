import Link from "next/link";

import { RiskContourSignal } from "@/components/RiskContourSignal";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink px-12 py-16 text-mist lg:flex lg:flex-col lg:justify-between">
        <div className="contour-field" aria-hidden="true" />

        <Link href="/" className="relative flex items-center gap-2 font-display text-lg font-semibold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-signal" />
          AquaWatch
        </Link>

        <div className="relative flex flex-1 items-center justify-center">
          <RiskContourSignal className="h-[320px] w-[320px]" />
        </div>

        <p className="relative max-w-sm text-sm text-mist/70">
          Ward-level malaria risk, computed weekly from satellite flood data and delivered before the
          case count rises.
        </p>
      </div>

      <div className="flex items-center justify-center bg-mist px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="eyebrow text-flood">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-slate-soft">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
