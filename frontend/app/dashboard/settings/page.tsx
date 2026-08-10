import { redirect } from "next/navigation";

import { RefreshRiskCacheButton } from "@/components/RefreshRiskCacheButton";
import { ThresholdSettingsForm } from "@/components/ThresholdSettingsForm";
import { fetchOwnProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_DEFAULT_THRESHOLD = 0.66;

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const profile = await fetchOwnProfile(session.access_token);

  return (
    <div>
      <p className="eyebrow text-flood">Settings</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Alert configuration</h1>
      <p className="mt-1 text-sm text-slate-soft">
        Tune how sensitive alerts are for the wards you oversee.
      </p>

      <div className="mt-8">
        <ThresholdSettingsForm
          initialThreshold={profile?.alertThreshold ?? null}
          systemDefault={SYSTEM_DEFAULT_THRESHOLD}
        />
      </div>

      {profile?.role === "government" ? (
        <div className="mt-8 max-w-md rounded-[var(--radius-card)] border border-ink/8 bg-white p-6 shadow-[var(--shadow-panel)]">
          <h2 className="font-display text-lg font-semibold text-ink">Risk score cache</h2>
          <p className="mt-1 text-sm text-slate-soft">
            Ward risk scores are cached for speed and refreshed automatically on a schedule. Use this
            to force an immediate refresh — this can take a minute or two for all wards.
          </p>
          <div className="mt-4">
            <RefreshRiskCacheButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
