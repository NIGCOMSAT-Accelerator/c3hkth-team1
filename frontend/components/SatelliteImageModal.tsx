"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

interface WardImageState {
  status: "idle" | "loading" | "ready" | "unavailable" | "error";
  url: string | null;
  updatedAt: string | null;
}

export function SatelliteImageModal({ wardId, wardName }: { wardId: string; wardName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<WardImageState>({ status: "idle", url: null, updatedAt: null });

  useEffect(() => {
    if (!isOpen || state.status !== "idle") return;

    setState({ status: "loading", url: null, updatedAt: null });

    const supabase = createClient();

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!session) {
          throw new Error("not signed in");
        }

        return fetch(`${BACKEND_URL}/wards/${wardId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("request failed"))))
      .then((body: { data: { satelliteImageUrl: string | null; satelliteImageUpdatedAt: string | null } }) => {
        if (body.data.satelliteImageUrl) {
          setState({ status: "ready", url: body.data.satelliteImageUrl, updatedAt: body.data.satelliteImageUpdatedAt });
        } else {
          setState({ status: "unavailable", url: null, updatedAt: null });
        }
      })
      .catch(() => setState({ status: "error", url: null, updatedAt: null }));
  }, [isOpen, state.status, wardId]);

  function handleClose() {
    setIsOpen(false);
    setState({ status: "idle", url: null, updatedAt: null });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-ink/12 px-3 py-1 text-xs font-medium text-ink transition hover:bg-mist-dim/60"
      >
        View image
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4"
          onClick={handleClose}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-panel-dark)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
              <div>
                <p className="font-display text-base font-semibold text-ink">{wardName}</p>
                <p className="text-xs text-slate-soft">Sentinel-1 standing water detection</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1.5 text-slate-soft transition hover:bg-mist-dim/60 hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-[280px] items-center justify-center p-6">
              {state.status === "loading" ? (
                <p className="text-sm text-slate-soft">Loading image…</p>
              ) : null}

              {state.status === "unavailable" ? (
                <p className="max-w-xs text-center text-sm text-slate-soft">
                  No satellite image has been generated for this ward yet.
                </p>
              ) : null}

              {state.status === "error" ? (
                <p className="max-w-xs text-center text-sm text-alert">
                  Couldn&apos;t load the image. Try again shortly.
                </p>
              ) : null}

              {state.status === "ready" && state.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.url}
                  alt={`Satellite water detection for ${wardName}`}
                  className="max-h-[60vh] w-full rounded-lg object-contain"
                />
              ) : null}
            </div>

            {state.status === "ready" && state.updatedAt ? (
              <div className="border-t border-ink/8 px-5 py-3 text-xs text-slate-soft">
                Captured {new Date(state.updatedAt).toLocaleDateString()}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
