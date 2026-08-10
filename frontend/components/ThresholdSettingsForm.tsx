"use client";

import { useState, useTransition } from "react";

import { updateThresholdAction } from "@/lib/actions/settings";

export function ThresholdSettingsForm({
  initialThreshold,
  systemDefault,
}: {
  initialThreshold: number | null;
  systemDefault: number;
}) {
  const [isOverridden, setIsOverridden] = useState(initialThreshold !== null);
  const [value, setValue] = useState(initialThreshold ?? systemDefault);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateThresholdAction(isOverridden ? value : null);
      setMessage(result.error ? `Failed: ${result.error}` : "Saved");
    });
  }

  return (
    <div className="max-w-md rounded-[var(--radius-card)] border border-ink/8 bg-white p-6 shadow-[var(--shadow-panel)]">
      <h2 className="font-display text-lg font-semibold text-ink">Alert threshold</h2>
      <p className="mt-1 text-sm text-slate-soft">
        Alerts fire when a ward&apos;s risk score reaches this value. System default is{" "}
        <span className="font-data">{systemDefault.toFixed(2)}</span>.
      </p>

      <label className="mt-5 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isOverridden}
          onChange={(event) => setIsOverridden(event.target.checked)}
          className="h-4 w-4 rounded border-ink/20 text-flood focus:ring-flood/30"
        />
        Use a custom threshold for wards I oversee
      </label>

      {isOverridden ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate">Trigger at</span>
            <span className="font-data text-ink">{value.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            className="mt-2 w-full accent-flood"
          />
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-mist transition hover:bg-ink-soft disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {message ? <span className="text-xs text-slate-soft">{message}</span> : null}
      </div>
    </div>
  );
}
