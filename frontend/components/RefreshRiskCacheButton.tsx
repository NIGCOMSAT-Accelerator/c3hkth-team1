"use client";

import { useState, useTransition } from "react";

import { refreshRiskCacheAction } from "@/lib/actions/riskCache";

export function RefreshRiskCacheButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshRiskCacheAction();
      if (result.error) {
        setMessage(`Failed: ${result.error}`);
      } else if (result.summary) {
        setMessage(
          `Refreshed ${result.summary.wardsUpdated} of ${result.summary.wardsChecked} wards` +
            (result.summary.wardsFailed > 0 ? ` (${result.summary.wardsFailed} failed)` : "")
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-ink/12 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-mist-dim/60 disabled:opacity-60"
      >
        {isPending ? "Refreshing risk scores…" : "Refresh risk scores now"}
      </button>
      {message ? <span className="text-xs text-slate-soft">{message}</span> : null}
    </div>
  );
}
