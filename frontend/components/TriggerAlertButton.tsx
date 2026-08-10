"use client";

import { useState, useTransition } from "react";

import { triggerWardAlertAction } from "@/lib/actions/alerts";

export function TriggerAlertButton({ wardId }: { wardId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const outcome = await triggerWardAlertAction(wardId);

      if (outcome.error) {
        setResult(`Failed: ${outcome.error}`);
        return;
      }

      setResult(
        outcome.triggered
          ? `Sent ${outcome.alertsSent} alert${outcome.alertsSent === 1 ? "" : "s"}`
          : "Below threshold, no alert sent"
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-flood/30 px-3 py-1 text-xs font-medium text-flood transition hover:bg-flood/5 disabled:opacity-50"
      >
        {isPending ? "Checking…" : "Trigger alert"}
      </button>
      {result ? <span className="text-xs text-slate-soft">{result}</span> : null}
    </div>
  );
}
