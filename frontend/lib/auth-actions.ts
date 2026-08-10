"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export interface AuthActionState {
  error: string | null;
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  const lgaId = String(formData.get("lgaId") ?? "") || null;
  const wardId = String(formData.get("wardId") ?? "") || null;
  const phoneNumber = String(formData.get("phoneNumber") ?? "") || null;
  const isWhatsappCapable = formData.get("isWhatsappCapable") === "true";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    redirect("/login?registered=true");
  }

  const profileResponse = await fetch(`${BACKEND_URL}/users/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fullName, role, lgaId, wardId, phoneNumber, isWhatsappCapable }),
  });

  if (!profileResponse.ok) {
    const body = await profileResponse.json().catch(() => ({ message: "unknown error" }));
    return { error: body.message ?? "failed to create your profile, please try again" };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
