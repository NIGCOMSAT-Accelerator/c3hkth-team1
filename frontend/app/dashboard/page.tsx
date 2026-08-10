import Link from "next/link";
import { redirect } from "next/navigation";

import { LiveIndicator } from "@/components/LiveIndicator";
import { RiskPill } from "@/components/RiskPill";
import { StatCard } from "@/components/StatCard";
import { cachedRiskFromWard, fetchAlertStats, fetchRecentAlerts, fetchWards } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const accessToken = session.access_token;
  const [wards, alertStats, recentAlerts] = await Promise.all([
    fetchWards(accessToken),
    fetchAlertStats(accessToken),
    fetchRecentAlerts(accessToken),
  ]);

  const assessments = wards.map((ward) => ({ ward, risk: cachedRiskFromWard(ward) }));

  const highRiskCount = assessments.filter((row) => row.risk?.riskLabel === "high").length;

  const topRisk = assessments
    .filter((row): row is { ward: (typeof wards)[number]; risk: NonNullable<(typeof assessments)[number]["risk"]> } => row.risk !== null)
    .sort((a, b) => b.risk.riskScore - a.risk.riskScore)
    .slice(0, 5);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-flood">Overview</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Welcome back</h1>
        </div>
        <LiveIndicator />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={String(wards.length)} label="Wards monitored" />
        <StatCard value={String(highRiskCount)} label="High risk now" />
        <StatCard value={String(alertStats.sent)} label="Alerts sent" />
        <StatCard value={String(alertStats.failed)} label="Alerts failed" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-ink/8 bg-white shadow-[var(--shadow-panel)]">
          <div className="border-b border-ink/8 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Highest risk wards</h2>
          </div>
          {topRisk.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-soft">No risk data yet.</p>
          ) : (
            <ul className="divide-y divide-ink/6">
              {topRisk.map(({ ward, risk }) => (
                <li key={ward.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-ink">{ward.name}</p>
                    <p className="text-xs text-slate-soft">
                      {ward.lgaName}, {ward.state}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-data text-slate">{risk.riskScore.toFixed(2)}</span>
                    <RiskPill level={risk.riskLabel} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] border border-ink/8 bg-white shadow-[var(--shadow-panel)]">
          <div className="border-b border-ink/8 px-6 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Recent alerts</h2>
          </div>
          {recentAlerts.length === 0 ? (
            <p className="px-6 py-8 text-sm text-slate-soft">No alerts sent yet.</p>
          ) : (
            <ul className="divide-y divide-ink/6">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="px-6 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink">{alert.wardName}</p>
                    <span
                      className={`text-xs font-medium ${alert.status === "sent" ? "text-low" : "text-alert"}`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-soft">
                    {alert.channel} · {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 text-right">
        <Link href="/dashboard/wards" className="text-sm font-medium text-flood hover:underline">
          View full ward table →
        </Link>
      </div>
    </div>
  );
}
