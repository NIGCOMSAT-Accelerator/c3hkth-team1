import { redirect } from "next/navigation";

import { RiskRefreshProgress } from "@/components/RiskRefreshProgress";
import { StatCard } from "@/components/StatCard";
import { WardTable } from "@/components/WardTable";
import { cachedRiskFromWard, fetchAlertStats, fetchOwnProfile, fetchWards, type WardRiskAssessment } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const accessToken = session.access_token;
  const [wards, alertStats, profile] = await Promise.all([
    fetchWards(accessToken),
    fetchAlertStats(accessToken),
    fetchOwnProfile(accessToken),
  ]);

  const assessments = wards.map((ward) => ({ ward, risk: cachedRiskFromWard(ward) }));

  const highRiskCount = assessments.filter((row) => row.risk?.riskLabel === "high").length;
  const moderateRiskCount = assessments.filter((row) => row.risk?.riskLabel === "moderate").length;
  const lowRiskCount = assessments.filter((row) => row.risk?.riskLabel === "low").length;
  const pendingCount = assessments.filter(
    (row): row is { ward: (typeof wards)[number]; risk: null } => row.risk === null
  ).length;
  const assessedCount = assessments.filter((row): row is { ward: (typeof wards)[number]; risk: WardRiskAssessment } => row.risk !== null).length;

  return (
    <div>
      <p className="eyebrow text-flood">Wards</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Ward risk</h1>
      <p className="mt-1 text-sm text-slate-soft">
        Updated live from the latest satellite and rainfall observations.
      </p>

      {profile?.role === "government" ? (
        <div className="mt-6">
          <RiskRefreshProgress wardIds={wards.map((ward) => ward.id)} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard value={String(wards.length)} label="Wards monitored" />
        <StatCard value={String(highRiskCount)} label="High risk" />
        <StatCard value={String(moderateRiskCount)} label="Moderate risk" />
        <StatCard value={String(lowRiskCount)} label="Low risk" />
        <StatCard value={String(pendingCount)} label="Pending data" />
        <StatCard value={String(assessedCount)} label="With a current score" />
        <StatCard value={String(alertStats.sent)} label="Alerts sent" />
        <StatCard value={String(alertStats.failed)} label="Alerts failed" />
      </div>

      <div className="mt-10 overflow-hidden rounded-[var(--radius-card)] border border-ink/8 bg-white shadow-[var(--shadow-panel)]">
        {wards.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink">No wards registered yet</p>
            <p className="mt-2 text-sm text-slate-soft">
              Wards appear here once their boundaries and observations are loaded into the pipeline.
            </p>
          </div>
        ) : (
          <WardTable rows={assessments} />
        )}
      </div>
    </div>
  );
}
