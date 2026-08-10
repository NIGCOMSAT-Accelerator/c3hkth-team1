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
    <div className="flex min-h-screen flex-col bg-mist lg:flex-row">
      <DashboardSidebar userEmail={session?.user.email ?? null} role={profile?.role ?? null} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-10">{children}</main>
    </div>
  );
}
