"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface TriggerAlertResult {
  triggered: boolean;
  alertsSent: number;
  error: string | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export async function triggerWardAlertAction(wardId: string): Promise<TriggerAlertResult> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { triggered: false, alertsSent: 0, error: "not signed in" };
    }

    const response = await fetch(`${BACKEND_URL}/wards/${wardId}/alerts/trigger`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      return { triggered: false, alertsSent: 0, error: `backend returned status ${response.status}` };
    }

    const body = (await response.json()) as {
      data: { triggered: boolean; alerts: Array<{ status: string }> };
    };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wards");

    return {
      triggered: body.data.triggered,
      alertsSent: body.data.alerts.filter((alert) => alert.status === "sent").length,
      error: null,
    };
  } catch (error) {
    return { triggered: false, alertsSent: 0, error: (error as Error).message };
  }
}
