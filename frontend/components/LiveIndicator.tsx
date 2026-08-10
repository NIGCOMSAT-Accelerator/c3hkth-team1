"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function LiveIndicator({ intervalSeconds = 60 }: { intervalSeconds?: number }) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      router.refresh();
      setLastUpdated(new Date());
    }, intervalSeconds * 1000);

    return () => clearInterval(refreshTimer);
  }, [router, intervalSeconds]);

  useEffect(() => {
    if (!lastUpdated) return;

    const tickTimer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(tickTimer);
  }, [lastUpdated]);

  return (
    <div className="flex items-center gap-2 text-xs text-slate-soft">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-low opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-low" />
      </span>
      <span className="font-medium text-ink">Live</span>
      <span suppressHydrationWarning>
        {lastUpdated === null ? "Updating…" : secondsAgo < 5 ? "Updated just now" : `Updated ${secondsAgo}s ago`}
      </span>
    </div>
  );
}
