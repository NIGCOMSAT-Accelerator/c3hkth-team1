import { redirect } from "next/navigation";

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
    </div>
  );
}
