import { DashboardSidebar } from "@/components/DashboardSidebar";
import { fetchOwnProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const profile = session ? await fetchOwnProfile(session.access_token) : null;

  return (
    <div className="flex min-h-screen bg-mist">
      <DashboardSidebar userEmail={session?.user.email ?? null} role={profile?.role ?? null} />
      <main className="flex-1 overflow-y-auto px-10 py-10">{children}</main>
    </div>
  );
}
