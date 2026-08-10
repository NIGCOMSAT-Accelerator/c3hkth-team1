"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { signInAction, type AuthActionState } from "@/lib/auth-actions";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Sign in to view ward risk and manage alerts for your LGA."
    >
      <form action={formAction} className="space-y-4">
        <FormField label="Email" name="email" type="email" autoComplete="email" />
        <FormField label="Password" name="password" type="password" autoComplete="current-password" />

        {state.error ? (
          <p role="alert" className="rounded-lg bg-alert-soft px-3 py-2 text-sm text-alert">
            {state.error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-mist transition hover:bg-ink-soft disabled:opacity-60"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-soft">
        New here?{" "}
        <Link href="/signup" className="font-medium text-flood hover:underline">
          Request access
        </Link>
      </p>
    </AuthShell>
  );
}
