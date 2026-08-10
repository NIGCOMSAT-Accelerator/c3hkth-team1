"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export interface RefreshRiskCacheResult {
  error: string | null;
  summary: { wardsChecked: number; wardsUpdated: number; wardsFailed: number } | null;
}

export async function refreshRiskCacheAction(): Promise<RefreshRiskCacheResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "not signed in", summary: null };
  }

  const response = await fetch(`${BACKEND_URL}/wards/risk/refresh-cache`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "unknown error" }));
    return { error: body.message ?? "failed to refresh risk cache", summary: null };
  }

  const body = (await response.json()) as {
    data: { wardsChecked: number; wardsUpdated: number; wardsFailed: number };
  };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wards");
  revalidatePath("/dashboard/analytics");

  return { error: null, summary: body.data };
}

export async function refreshWardRiskBatchAction(wardIds: string[]): Promise<RefreshRiskCacheResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "not signed in", summary: null };
  }

  const response = await fetch(`${BACKEND_URL}/wards/risk/refresh-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ wardIds }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "unknown error" }));
    return { error: body.message ?? "failed to refresh batch", summary: null };
  }

  const body = (await response.json()) as {
    data: { wardsChecked: number; wardsUpdated: number; wardsFailed: number };
  };

  return { error: null, summary: body.data };
}
