import { redirect } from "next/navigation";

import {
  AlertsOverTimeChart,
  ChannelBreakdownChart,
  RiskDistributionChart,
} from "@/components/AnalyticsCharts";
import { RiskRefreshProgress } from "@/components/RiskRefreshProgress";
import { fetchAlertAnalytics, fetchOwnProfile, fetchWards } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const accessToken = session.access_token;
  const [wards, analytics, profile] = await Promise.all([
    fetchWards(accessToken),
    fetchAlertAnalytics(accessToken),
    fetchOwnProfile(accessToken),
  ]);

  const distribution = {
    low: wards.filter((ward) => ward.cachedRiskLabel === "low").length,
    moderate: wards.filter((ward) => ward.cachedRiskLabel === "moderate").length,
    high: wards.filter((ward) => ward.cachedRiskLabel === "high").length,
    pending: wards.filter((ward) => ward.cachedRiskLabel == null).length,
  };

  return (
    <div>
      <p className="eyebrow text-flood">Analytics</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Risk &amp; alert trends</h1>
      <p className="mt-1 text-sm text-slate-soft">
        A rolling view of ward risk and alert delivery across the wards you oversee.
      </p>

      {profile?.role === "government" ? (
        <div className="mt-6">
          <RiskRefreshProgress wardIds={wards.map((ward) => ward.id)} />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RiskDistributionChart distribution={distribution} />
        <ChannelBreakdownChart byChannel={analytics.byChannel} />
        <div className="lg:col-span-2">
          <AlertsOverTimeChart byDay={analytics.byDay} />
        </div>
      </div>
    </div>
  );
}
