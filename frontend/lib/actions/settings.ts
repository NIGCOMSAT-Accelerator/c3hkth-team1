"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export interface UpdateThresholdResult {
  error: string | null;
}

export async function updateThresholdAction(alertThreshold: number | null): Promise<UpdateThresholdResult> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "not signed in" };
  }

  const response = await fetch(`${BACKEND_URL}/users/threshold`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ alertThreshold }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: "unknown error" }));
    return { error: body.message ?? "failed to update threshold" };
  }

  revalidatePath("/dashboard/settings");
  return { error: null };
}
