"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { WardSummary } from "@/lib/api";

export function NotificationsFilters({ wards }: { wards: WardSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/dashboard/notifications?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        defaultValue={searchParams.get("channel") ?? ""}
        onChange={(event) => updateParam("channel", event.target.value)}
        className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
      >
        <option value="">All channels</option>
        <option value="sms">SMS</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="email">Email</option>
      </select>

      <select
        defaultValue={searchParams.get("status") ?? ""}
        onChange={(event) => updateParam("status", event.target.value)}
        className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
      >
        <option value="">All statuses</option>
        <option value="sent">Sent</option>
        <option value="failed">Failed</option>
      </select>

      <select
        defaultValue={searchParams.get("wardId") ?? ""}
        onChange={(event) => updateParam("wardId", event.target.value)}
        className="rounded-lg border border-ink/12 bg-white px-3 py-2 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
      >
        <option value="">All wards</option>
        {wards.map((ward) => (
          <option key={ward.id} value={ward.id}>
            {ward.name} ({ward.lgaName})
          </option>
        ))}
      </select>
    </div>
  );
}
