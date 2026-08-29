"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type Purchase = { email: string; amountCents: number; createdAt: number };
export type Activity = {
  leadsFound: number;
  searchesRun: number;
  leadsSaved: number;
  lastSearchAt: number | null;
};

function ago(ts: number, now: number) {
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"} ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/**
 * Social proof from real data only: actual purchases when they exist, genuine
 * product activity until then. Nothing here is invented — a fake buyer is a
 * fake testimonial, and it only has to be caught once.
 */
export default function SocialProof({
  purchases,
  activity,
}: {
  purchases: Purchase[];
  activity: Activity | null;
}) {
  const [i, setI] = useState(0);

  /**
   * The wall clock is an external store, so it is read with
   * useSyncExternalStore rather than setState-in-an-effect. The snapshot is
   * quantised to 15s so it stays referentially stable between ticks, and the
   * server snapshot is null so SSR renders no timestamp at all.
   */
  const now = useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, 15_000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 15_000) * 15_000,
    () => null
  );

  useEffect(() => {
    if (purchases.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % purchases.length), 4200);
    return () => clearInterval(id);
  }, [purchases.length]);

  const hasPurchases = purchases.length > 0;
  const hasActivity = Boolean(activity && activity.leadsFound > 0);
  if (!hasPurchases && !hasActivity) return null;

  const p = hasPurchases ? purchases[i % purchases.length] : null;

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="mx-auto flex h-8 max-w-5xl items-center justify-center gap-2 px-5 text-[12.5px]">
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
        {p ? (
          <p key={i} className="rise truncate text-muted">
            <span className="font-bold text-foreground">{p.email}</span> purchased Lifetime
            {now !== null && (
              <span className="text-subtle">
                {" · "}
                {ago(p.createdAt, now)}
              </span>
            )}
          </p>
        ) : (
          <p className="truncate text-muted">
            <span className="font-bold text-foreground tabular-nums">
              {activity!.leadsFound.toLocaleString()}
            </span>{" "}
            leads found this week
            <span className="text-subtle">
              {" · "}
              {activity!.searchesRun} searches
              {activity!.leadsSaved > 0 ? ` · ${activity!.leadsSaved} saved` : ""}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
