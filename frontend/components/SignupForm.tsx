"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { signUpAction, type AuthActionState } from "@/lib/auth-actions";
import type { WardSummary } from "@/lib/api";

const initialState: AuthActionState = { error: null };

export function SignupForm({ wards }: { wards: WardSummary[] }) {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);
  const [role, setRole] = useState<"government" | "lga_official" | "ward_official">("government");
  const [selectedLgaId, setSelectedLgaId] = useState("");

  const lgas = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; state: string }>();
    for (const ward of wards) {
      if (!byId.has(ward.lgaId)) {
        byId.set(ward.lgaId, { id: ward.lgaId, name: ward.lgaName, state: ward.state });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [wards]);

  const wardsInSelectedLga = useMemo(
    () => wards.filter((ward) => ward.lgaId === selectedLgaId).sort((a, b) => a.name.localeCompare(b.name)),
    [wards, selectedLgaId]
  );

  return (
    <AuthShell
      eyebrow="Request access"
      title="Register your account"
      subtitle="Create an account to monitor ward risk and manage health-worker alerts."
    >
      <form action={formAction} className="space-y-4">
        <FormField label="Full name" name="fullName" autoComplete="name" />
        <FormField label="Email" name="email" type="email" autoComplete="email" />
        <FormField label="Password" name="password" type="password" autoComplete="new-password" />

        <label className="block">
          <span className="text-sm font-medium text-ink">Role</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="mt-1.5 w-full rounded-lg border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
          >
            <option value="government">Government (all wards)</option>
            <option value="lga_official">LGA coordinator</option>
            <option value="ward_official">Ward health worker (CHEW)</option>
          </select>
        </label>

        {role !== "government" ? (
          <label className="block">
            <span className="text-sm font-medium text-ink">Local Government Area</span>
            <select
              name="lgaId"
              required
              value={selectedLgaId}
              onChange={(event) => setSelectedLgaId(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20"
            >
              <option value="">Select an LGA</option>
              {lgas.map((lga) => (
                <option key={lga.id} value={lga.id}>
                  {lga.name} ({lga.state})
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {role === "ward_official" ? (
          <label className="block">
            <span className="text-sm font-medium text-ink">Ward</span>
            <select
              name="wardId"
              required
              disabled={!selectedLgaId}
              className="mt-1.5 w-full rounded-lg border border-ink/12 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-flood focus:outline-none focus:ring-2 focus:ring-flood/20 disabled:opacity-50"
            >
              <option value="">{selectedLgaId ? "Select a ward" : "Choose an LGA first"}</option>
              {wardsInSelectedLga.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {role !== "government" ? (
          <>
            <FormField label="Phone number" name="phoneNumber" type="tel" autoComplete="tel" />
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="isWhatsappCapable"
                value="true"
                defaultChecked
                className="mt-0.5 h-4 w-4 rounded border-ink/20 text-flood focus:ring-flood/30"
              />
              <span>
                This number is on WhatsApp
                <span className="block text-xs text-slate-soft">
                  Uncheck this if the number above can&apos;t receive WhatsApp messages — you&apos;ll still get
                  alerts by SMS and email.
                </span>
              </span>
            </label>
          </>
        ) : null}

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
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-soft">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-flood hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
