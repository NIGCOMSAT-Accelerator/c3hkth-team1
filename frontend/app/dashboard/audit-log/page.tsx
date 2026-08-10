import { redirect } from "next/navigation";

import { fetchAuditLogs } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  "profile.upserted": "Profile updated",
  "threshold.updated": "Threshold changed",
  "alert.manually_triggered": "Alert triggered (manual)",
  "alert.cron_triggered": "Alert triggered (scheduled)",
  "health_worker.registered": "Health worker registered",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const result = await fetchAuditLogs(session.access_token, { page, pageSize: PAGE_SIZE });

  if (!result) {
    return (
      <div>
        <p className="eyebrow text-flood">Audit log</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Not available</h1>
        <p className="mt-2 text-sm text-slate-soft">
          The audit log is only available to government accounts.
        </p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div>
      <p className="eyebrow text-flood">Audit log</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">System activity</h1>
      <p className="mt-1 text-sm text-slate-soft">
        Every profile change, threshold update, alert trigger, and registration across the system.
      </p>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-ink/8 bg-white shadow-[var(--shadow-panel)]">
        {result.logs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink">No activity yet</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/8 bg-mist-dim/60 text-xs uppercase tracking-wide text-slate-soft">
              <tr>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium">Details</th>
                <th className="px-6 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.map((log) => (
                <tr key={log.id} className="border-b border-ink/6 last:border-0">
                  <td className="px-6 py-4 text-slate">{log.actorEmail ?? "System (scheduled)"}</td>
                  <td className="px-6 py-4 font-medium text-ink">{ACTION_LABELS[log.action] ?? log.action}</td>
                  <td className="px-6 py-4 text-xs text-slate-soft">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-6 py-4 font-data text-xs text-slate-soft">
                    {Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : "—"}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-soft">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result.total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-soft">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total}
          </span>
          <span className="font-data text-xs">
            {page} / {totalPages}
          </span>
        </div>
      ) : null}
    </div>
  );
}
