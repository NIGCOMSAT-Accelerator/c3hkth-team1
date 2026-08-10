"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { refreshWardRiskBatchAction } from "@/lib/actions/riskCache";

const BATCH_SIZE = 25;

type Status = "idle" | "running" | "done" | "error";

export function RiskRefreshProgress({ wardIds }: { wardIds: string[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [processed, setProcessed] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const total = wardIds.length;
  const percent = total === 0 ? 0 : Math.round((processed / total) * 100);

  async function handleClick() {
    setStatus("running");
    setProcessed(0);
    setFailedCount(0);
    setErrorMessage(null);

    let failed = 0;

    for (let i = 0; i < wardIds.length; i += BATCH_SIZE) {
      const batch = wardIds.slice(i, i + BATCH_SIZE);
      const result = await refreshWardRiskBatchAction(batch);

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
        return;
      }

      failed += result.summary?.wardsFailed ?? 0;
      setProcessed((prev) => prev + batch.length);
      setFailedCount(failed);
    }

    setStatus("done");
    router.refresh();
  }

  if (total === 0) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-ink/8 bg-white p-4 shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Risk scores</p>
          <p className="text-xs text-slate-soft">
            {status === "running"
              ? `Refreshing… ${percent}% (${processed}/${total} wards)${
                  failedCount > 0 ? ` — ${failedCount} failed` : ""
                }`
              : status === "done"
                ? `Done — refreshed ${processed} of ${total} wards${
                    failedCount > 0 ? ` (${failedCount} failed)` : ""
                  }`
                : status === "error"
                  ? `Failed: ${errorMessage}`
                  : "Click refresh to compute the latest risk scores for every ward"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "running"}
          className="rounded-lg border border-ink/12 px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-mist-dim/60 disabled:opacity-60"
        >
          {status === "running" ? "Refreshing…" : "Refresh risk scores"}
        </button>
      </div>

      {status === "running" ? (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-mist-dim">
          <div
            className="h-full rounded-full bg-flood transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
