import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationsFilters } from "@/components/NotificationsFilters";
import { fetchNotifications, fetchWards } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export default async function NotificationsPage({
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
  const accessToken = session.access_token;
  const page = Number(params.page ?? "1") || 1;

  const [wards, notifications] = await Promise.all([
    fetchWards(accessToken),
    fetchNotifications(accessToken, {
      page,
      pageSize: PAGE_SIZE,
      channel: params.channel as "sms" | "whatsapp" | "email" | undefined,
      status: params.status as "sent" | "failed" | undefined,
      wardId: params.wardId,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(notifications.total / PAGE_SIZE));

  function buildPageHref(targetPage: number) {
    const next = new URLSearchParams();
    if (params.channel) next.set("channel", params.channel);
    if (params.status) next.set("status", params.status);
    if (params.wardId) next.set("wardId", params.wardId);
    next.set("page", String(targetPage));
    return `/dashboard/notifications?${next.toString()}`;
  }

  return (
    <div>
      <p className="eyebrow text-flood">Notifications</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Alert history</h1>
      <p className="mt-1 text-sm text-slate-soft">Every alert sent to wards you oversee.</p>

      <div className="mt-6">
        <NotificationsFilters wards={wards} />
      </div>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-ink/8 bg-white shadow-[var(--shadow-panel)]">
        {notifications.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-ink">No notifications match these filters</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/8 bg-mist-dim/60 text-xs uppercase tracking-wide text-slate-soft">
              <tr>
                <th className="px-6 py-3 font-medium">Ward</th>
                <th className="px-6 py-3 font-medium">Channel</th>
                <th className="px-6 py-3 font-medium">Risk</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Sent</th>
              </tr>
            </thead>
            <tbody>
              {notifications.items.map((item) => (
                <tr key={item.id} className="border-b border-ink/6 last:border-0">
                  <td className="px-6 py-4 font-medium text-ink">{item.wardName}</td>
                  <td className="px-6 py-4 text-slate capitalize">{item.channel}</td>
                  <td className="px-6 py-4 font-data text-slate">{item.riskScore.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium ${item.status === "sent" ? "text-low" : "text-alert"}`}
                    >
                      {item.status}
                      {item.status === "failed" && item.errorMessage ? (
                        <span className="ml-1 text-slate-soft">— {item.errorMessage}</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-soft">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {notifications.total > 0 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-soft">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, notifications.total)} of{" "}
            {notifications.total}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={buildPageHref(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={`rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-mist-dim/60 ${
                page === 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Previous
            </Link>
            <span className="font-data text-xs">
              {page} / {totalPages}
            </span>
            <Link
              href={buildPageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={`rounded-lg border border-ink/12 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-mist-dim/60 ${
                page === totalPages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
