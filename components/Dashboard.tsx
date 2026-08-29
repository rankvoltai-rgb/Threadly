"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo, Spinner, Arrow, Check, Lock, Bookmark } from "./Icons";
import { LeadCard, LockedCard, type UnlockedLead, type LockedLead } from "./LeadCard";
import Pipeline, { type SavedLead, type SavedStatus } from "./Pipeline";
import ThreadsRain from "./ThreadsRain";
import RotatingWord from "./RotatingWord";

type SearchResult = {
  licensed: boolean;
  total: number;
  unlocked: UnlockedLead[];
  locked: LockedLead[];
  trialRemaining: number | null;
  freeLimit?: number;
};

const EXAMPLES = [
  "looking for a web designer",
  "need a virtual assistant",
  "recommend a bookkeeper",
  "looking for a video editor",
  "need help with SEO",
];

const RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function Dashboard({
  initialLicensed,
  initialTrialRemaining,
  freeLimit,
  checkoutStatus,
  convexEnabled,
  initialSaved,
}: {
  initialLicensed: boolean;
  initialTrialRemaining: number;
  freeLimit: number;
  checkoutStatus?: string;
  convexEnabled: boolean;
  initialSaved: SavedLead[];
}) {
  const [keywords, setKeywords] = useState("");
  const [daysBack, setDaysBack] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [licensed, setLicensed] = useState(initialLicensed);
  const [trialRemaining, setTrialRemaining] = useState(initialTrialRemaining);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(
    checkoutStatus === "success"
      ? "Payment confirmed. Threadly is unlocked for life."
      : checkoutStatus === "cancelled"
        ? "Checkout cancelled — your free leads are still here."
        : checkoutStatus === "failed"
          ? "We couldn't confirm that payment. If you were charged, get in touch."
          : null
  );

  const [view, setView] = useState<"search" | "pipeline">("search");
  const [saved, setSaved] = useState<SavedLead[]>(initialSaved);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);
  const hasSearched = result !== null || loading;
  const savedIds = useMemo(() => new Set(saved.map((l) => l.postId)), [saved]);

  const refreshSaved = useCallback(async () => {
    if (!convexEnabled) return;
    try {
      const res = await fetch("/api/saved");
      const data = await res.json();
      if (Array.isArray(data.leads)) setSaved(data.leads);
    } catch {
      /* pipeline is non-critical; leave the last known list in place */
    }
  }, [convexEnabled]);

  const mutateSaved = useCallback(
    async (body: Record<string, unknown>) => {
      if (!convexEnabled) return;
      try {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } finally {
        refreshSaved();
      }
    },
    [convexEnabled, refreshSaved]
  );

  const toggleSave = useCallback(
    (lead: UnlockedLead) => {
      const isSaved = savedIds.has(lead.postId);
      // Optimistic: the button should never lag behind the click.
      setSaved((prev) =>
        isSaved
          ? prev.filter((l) => l.postId !== lead.postId)
          : [
              {
                _id: `optimistic-${lead.postId}`,
                postId: lead.postId,
                username: lead.username,
                fullName: lead.fullName ?? undefined,
                text: lead.text,
                url: lead.url,
                profileUrl: lead.profileUrl,
                score: lead.score,
                postedAt: lead.date,
                status: "new" as SavedStatus,
                savedAt: Date.now(),
              },
              ...prev,
            ]
      );
      mutateSaved(
        isSaved
          ? { action: "remove", postId: lead.postId }
          : {
              action: "save",
              postId: lead.postId,
              username: lead.username,
              fullName: lead.fullName ?? undefined,
              text: lead.text,
              url: lead.url,
              profileUrl: lead.profileUrl,
              score: lead.score,
              postedAt: lead.date,
            }
      );
    },
    [savedIds, mutateSaved]
  );

  const runSearch = useCallback(
    async (query?: string) => {
      const q = (query ?? keywords).trim();
      if (!q || loading) return;
      if (query) setKeywords(query);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: q, daysBack }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed.");
        setResult(data);
        setLicensed(data.licensed);
        if (typeof data.trialRemaining === "number") setTrialRemaining(data.trialRemaining);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [keywords, daysBack, loading]
  );

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const startCheckout = useCallback(async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Could not start checkout.");
      setCheckoutLoading(false);
    }
  }, []);

  const stats = useMemo(() => {
    if (!result) return null;
    const all = result.unlocked;
    const fresh = all.filter((l) => l.ageHours <= 24).length;
    const avg = all.length ? Math.round(all.reduce((s, l) => s + l.score, 0) / all.length) : 0;
    return { fresh, avg };
  }, [result]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--background) 82%, transparent)" }}>
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5">
          <Logo className="size-7" />
          <span className="text-[15px] font-semibold tracking-tight">Threadly</span>
          <div className="ml-auto flex items-center gap-3">
            {convexEnabled && (
              <button
                onClick={() => setView(view === "pipeline" ? "search" : "pipeline")}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors"
                style={
                  view === "pipeline"
                    ? { background: "var(--accent-soft)", color: "var(--accent)" }
                    : { color: "var(--muted)" }
                }
              >
                <Bookmark className="size-3.5" filled={view === "pipeline"} />
                <span className="hidden sm:inline">Pipeline</span>
                {saved.length ? <span className="tabular-nums">{saved.length}</span> : null}
              </button>
            )}
            {licensed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>
                <Check className="size-3" /> Lifetime
              </span>
            ) : (
              <>
                <span className="hidden text-[13px] text-muted tabular-nums sm:inline">
                  {trialRemaining} of {freeLimit} free leads left
                </span>
                <button
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="focus-ring shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: "var(--accent)" }}
                >
                  {checkoutLoading ? "Opening…" : (
                    <>
                      <span className="hidden sm:inline">Get lifetime · </span>$20
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {banner && (
        <div className="border-b px-5 py-2.5 text-center text-[13px]"
          style={{ borderColor: "var(--border)", background: "var(--accent-soft)", color: "var(--accent)" }}>
          {banner}
          <button onClick={() => setBanner(null)} className="focus-ring ml-3 rounded font-semibold underline">
            Dismiss
          </button>
        </div>
      )}

      <main className="flex-1">
        {view === "search" && (
        <section
          className={`relative hero-glow px-5 ${
            hasSearched
              ? "pt-10 pb-6"
              : "flex min-h-[calc(100svh-3.5rem)] items-center justify-center py-6"
          }`}
        >
          {!hasSearched && <ThreadsRain />}
          <div className="relative mx-auto w-full max-w-3xl text-center">
            {!hasSearched && (
              <>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium text-muted"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <Logo className="size-3" />
                  Live Threads data · no login required
                </span>
                <h1 className="mt-5 text-[34px] font-bold leading-[1.16] tracking-[-0.025em] sm:text-[52px] sm:leading-[1.12]">
                  <span className="block">
                    Turn{" "}
                    <Logo className="inline-block size-[0.82em] align-[-0.09em]" />{" "}
                    IG Thread into
                  </span>
                  {/* Own line: the reserved max-width box then centres cleanly
                      instead of leaving a gap after a short word. */}
                  <span className="mt-1 block">
                    <RotatingWord />
                  </span>
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-pretty text-[15.5px] leading-relaxed text-muted sm:text-[16.5px]">
                  Threadly searches Meta Threads for buying-intent posts, ranks them by how
                  recent they are, and hands you the freshest leads first.
                </p>
              </>
            )}

            <div className={`mx-auto ${hasSearched ? "" : "mt-7"} max-w-2xl`}>
              <div className="card p-2 shadow-[0_18px_50px_-18px_rgba(0,0,0,.9)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    placeholder="looking for a web designer, need a copywriter…"
                    aria-label="Keywords to search on Threads"
                    className="focus-ring min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-subtle"
                  />
                  <button
                    onClick={() => runSearch()}
                    disabled={loading || !keywords.trim()}
                    className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[14px] font-semibold text-white transition-colors disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    {loading ? <Spinner className="size-4" /> : null}
                    {loading ? "Searching…" : "Find leads"}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t px-2 pt-2 mt-1"
                  style={{ borderColor: "var(--border)" }}>
                  <span className="text-[12px] text-subtle">Posted within</span>
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setDaysBack(r.value)}
                      className="focus-ring rounded-md px-2 py-1 text-[12px] font-medium transition-colors"
                      style={
                        daysBack === r.value
                          ? { background: "var(--accent-soft)", color: "var(--accent)" }
                          : { color: "var(--muted)" }
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                  <span className="ml-auto text-[12px] text-subtle">
                    Separate keywords with commas
                  </span>
                </div>
              </div>

              {!hasSearched && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={ex}
                      onClick={() => runSearch(ex)}
                      className={`focus-ring rounded-full border px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:text-foreground ${
                        i >= 3 ? "hidden sm:inline-flex" : ""
                      }`}
                      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}

              {!hasSearched && !licensed && (
                <p className="mt-6 text-[13px] text-subtle">
                  {freeLimit} leads free — no signup. Then $20 once, yours for life.
                  {convexEnabled && (
                    <>
                      {" · "}
                      <button
                        onClick={() => setRestoreOpen(true)}
                        className="focus-ring rounded font-medium text-muted underline underline-offset-2 hover:text-foreground"
                      >
                        Restore purchase
                      </button>
                    </>
                  )}
                </p>
              )}

              {!hasSearched && (
                <p className="mt-2 text-[11.5px] text-subtle">
                  Public Threads posts only. Not affiliated with Meta.
                </p>
              )}
            </div>
          </div>
        </section>
        )}

        <div
          ref={resultsRef}
          className={`mx-auto max-w-3xl scroll-mt-16 px-5 ${
            view === "pipeline" ? "pt-8 pb-20" : hasSearched ? "pb-20" : ""
          }`}
        >
          {view === "pipeline" ? (
            <Pipeline
              leads={saved}
              onStatus={(postId, status) => {
                setSaved((prev) =>
                  prev.map((l) => (l.postId === postId ? { ...l, status } : l))
                );
                mutateSaved({ action: "status", postId, status });
              }}
              onNotes={(postId, notes) => mutateSaved({ action: "notes", postId, notes })}
              onRemove={(postId) => {
                setSaved((prev) => prev.filter((l) => l.postId !== postId));
                mutateSaved({ action: "remove", postId });
              }}
              onBack={() => setView("search")}
            />
          ) : (
          <>
          {error && (
            <div
              className="card mb-4 p-4 text-[14px]"
              style={{ borderColor: "var(--danger-line)", background: "var(--danger-soft)" }}
            >
              <p className="font-semibold text-white">Search failed</p>
              <p className="mt-1 text-muted">{error}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-40 rounded" style={{ background: "var(--surface-muted)" }} />
                    <div className="h-3 w-full rounded" style={{ background: "var(--surface-muted)" }} />
                    <div className="h-3 w-4/5 rounded" style={{ background: "var(--surface-muted)" }} />
                  </div>
                </div>
              ))}
              <p className="pt-2 text-center text-[13px] text-subtle">
                Scanning Threads — this usually takes 20–60 seconds.
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[15px] font-semibold">
                  {result.total} {result.total === 1 ? "lead" : "leads"}
                  <span className="ml-2 font-normal text-muted">newest first</span>
                </h2>
                {stats && result.unlocked.length > 0 && (
                  <p className="text-[12.5px] text-subtle tabular-nums">
                    {stats.fresh} posted today · avg score {stats.avg}
                  </p>
                )}
              </div>

              {result.total === 0 && (
                <div className="card p-8 text-center">
                  <p className="text-[15px] font-medium">No posts matched.</p>
                  <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
                    Try a longer date range, or phrase the keyword the way a buyer would
                    write it — “looking for a designer” beats “design services”.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {result.unlocked.map((lead, i) => (
                  <LeadCard
                    key={lead.postId}
                    lead={lead}
                    index={i}
                    showSave={convexEnabled}
                    saved={savedIds.has(lead.postId)}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>

              {result.locked.length > 0 && (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-subtle">
                      <Lock className="size-3.5" /> {result.locked.length} more leads locked
                    </span>
                    <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  </div>
                  <div className="space-y-3">
                    {result.locked.slice(0, 6).map((lead) => (
                      <LockedCard key={lead.postId} lead={lead} onUnlock={startCheckout} />
                    ))}
                  </div>
                  <Paywall
                    lockedCount={result.locked.length}
                    onCheckout={startCheckout}
                    loading={checkoutLoading}
                    error={checkoutError}
                  />
                </>
              )}

              {!licensed && result.locked.length === 0 && result.total > 0 && (
                <Paywall
                  lockedCount={0}
                  trialRemaining={trialRemaining}
                  onCheckout={startCheckout}
                  loading={checkoutLoading}
                  error={checkoutError}
                />
              )}
            </>
          )}

          </>
          )}
        </div>
      </main>

      {restoreOpen && (
        <RestoreDialog
          onClose={() => setRestoreOpen(false)}
          onRestored={() => {
            setRestoreOpen(false);
            setLicensed(true);
            setBanner("Purchase restored. Threadly is unlocked on this browser.");
          }}
        />
      )}

      {/* Landing is a single viewport, so the footer only appears once content scrolls. */}
      {(hasSearched || view === "pipeline") && (
        <footer className="border-t px-5 py-6" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-[12.5px] text-subtle">
            <span>Threadly · Threads lead generation</span>
            <span>Public Threads posts only. Not affiliated with Meta.</span>
          </div>
        </footer>
      )}
    </>
  );
}

function Paywall({
  lockedCount,
  trialRemaining,
  onCheckout,
  loading,
  error,
}: {
  lockedCount: number;
  trialRemaining?: number;
  onCheckout: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="card mt-6 overflow-hidden">
      <div className="hero-glow p-6 text-center sm:p-8">
        <h3 className="text-[22px] font-semibold tracking-[-0.02em]">
          {lockedCount > 0
            ? `Unlock all ${lockedCount} remaining leads`
            : trialRemaining === 0
              ? "You've used your free leads"
              : "Keep going, unlimited"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-muted">
          One payment of $20. Unlimited searches and unlimited leads, forever — no
          subscription, no seat limits.
        </p>

        <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left text-[13.5px] sm:grid-cols-2">
          {[
            "Unlimited keyword searches",
            "Every matching lead, unblurred",
            "Full post text + direct reply link",
            "Intent scoring & recency ranking",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-white" />
              <span className="text-muted">{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={onCheckout}
          disabled={loading}
          className="focus-ring mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {loading ? <Spinner className="size-4" /> : null}
          {loading ? "Opening checkout…" : "Get lifetime access · $20"}
          {!loading && <Arrow className="size-4" />}
        </button>

        {error && (
          <p className="mx-auto mt-3 max-w-md text-[13px] text-white">
            {error}
          </p>
        )}
        <p className="mt-3 text-[12px] text-subtle">Secure checkout by Stripe · one-time payment</p>
      </div>
    </div>
  );
}

function RestoreDialog({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not restore purchase.");
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore purchase.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "color-mix(in oklab, #000 45%, transparent)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Restore purchase"
      >
        <h3 className="text-[16px] font-semibold">Restore your purchase</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          Enter the email you paid with and we’ll unlock Threadly on this browser.
        </p>
        <input
          type="email"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@example.com"
          aria-label="Email used at checkout"
          className="focus-ring mt-4 w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none placeholder:text-subtle"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        />
        {error && (
          <p className="mt-2 text-[13px] text-white">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="focus-ring rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !email.trim()}
            className="focus-ring inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {busy ? <Spinner className="size-3.5" /> : null}
            {busy ? "Checking…" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
