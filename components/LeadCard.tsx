"use client";

import { Arrow, Lock, Bookmark } from "./Icons";

export type UnlockedLead = {
  postId: string;
  username: string;
  fullName: string | null;
  isVerified: boolean;
  text: string;
  likeCount: number;
  replyCount: number;
  date: string;
  ageHours: number;
  url: string;
  profileUrl: string;
  score: number;
  signals: string[];
  searchQuery?: string;
};

export type LockedLead = {
  postId: string;
  locked: true;
  date: string;
  ageHours: number;
  score: number;
  signals: string[];
  replyCount: number;
  likeCount: number;
  preview: string;
};

export function timeAgo(hours: number) {
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const d = Math.floor(hours / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function ScorePill({ score }: { score: number }) {
  const hot = score >= 70;
  const warm = score >= 45;
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{
        // White tiers rather than hues — brightness carries the ranking.
        background: hot
          ? "rgba(255,255,255,0.16)"
          : warm
            ? "rgba(255,255,255,0.09)"
            : "rgba(255,255,255,0.05)",
        color: hot ? "#fff" : warm ? "rgba(255,255,255,0.86)" : "var(--muted)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      title="Lead score: buying intent, recency and engagement"
    >
      {score}
    </span>
  );
}

export function LeadCard({
  lead,
  index,
  saved,
  onToggleSave,
  showSave,
}: {
  lead: UnlockedLead;
  index: number;
  saved?: boolean;
  onToggleSave?: (lead: UnlockedLead) => void;
  showSave?: boolean;
}) {
  const fresh = lead.ageHours <= 24;
  return (
    <article
      className="card rise p-4 transition-shadow hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-6px_rgba(16,24,40,.10)]"
      style={{ animationDelay: `${Math.min(index, 10) * 28}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <a
              href={lead.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring truncate rounded text-[15px] font-semibold hover:underline"
            >
              @{lead.username}
            </a>
            {lead.isVerified && (
              <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-white" aria-label="Verified">
                <path
                  fill="currentColor"
                  d="M8 0l1.9 1.4 2.3-.2.7 2.2 1.9 1.3-.9 2.2.9 2.2-1.9 1.3-.7 2.2-2.3-.2L8 16l-1.9-1.4-2.3.2-.7-2.2L1.2 11l.9-2.2-.9-2.2 1.9-1.3.7-2.2 2.3.2z"
                />
                <path d="M5 8l2 2 4-4.2" stroke="var(--surface)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </div>
          {lead.fullName && (
            <p className="truncate text-[13px] text-muted">{lead.fullName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {fresh && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}
            >
              New
            </span>
          )}
          <ScorePill score={lead.score} />
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed">{lead.text}</p>

      {lead.signals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lead.signals.map((s) => (
            <span
              key={s}
              className="rounded-md border px-1.5 py-0.5 text-[11px] font-medium text-muted"
              style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-[12.5px] text-subtle" style={{ borderColor: "var(--border)" }}>
        <span className="tabular-nums">{timeAgo(lead.ageHours)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{lead.replyCount} replies</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{lead.likeCount} likes</span>
        <div className="ml-auto flex items-center gap-3">
          {showSave && onToggleSave && (
            <button
              onClick={() => onToggleSave(lead)}
              aria-pressed={saved}
              className="focus-ring inline-flex items-center gap-1 rounded font-medium transition-colors"
              style={{ color: saved ? "var(--accent)" : "var(--muted)" }}
            >
              <Bookmark className="size-3.5" filled={saved} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
          <a
            href={lead.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring rounded font-medium text-muted hover:text-foreground"
          >
            Profile
          </a>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-white hover:underline"
          >
            Reply on Threads <Arrow className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function LockedCard({ lead, onUnlock }: { lead: LockedLead; onUnlock: () => void }) {
  return (
    <article className="card relative overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none select-none blur-[5px] opacity-60">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded" style={{ background: "var(--border-strong)" }} />
          <div className="h-4 w-8 rounded-full" style={{ background: "var(--border-strong)" }} />
        </div>
        <p className="mt-3 text-[14.5px] leading-relaxed">
          {lead.preview}… <span className="text-subtle">████████ ██████ ███████ ████ ██████████ ███</span>
        </p>
        <div className="mt-3 flex gap-1.5">
          {lead.signals.slice(0, 3).map((s) => (
            <span key={s} className="rounded-md px-1.5 py-0.5 text-[11px]" style={{ background: "var(--surface-muted)" }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-between gap-4 px-4"
        style={{ background: "color-mix(in oklab, var(--surface) 62%, transparent)" }}>
        <div className="flex items-center gap-2.5 text-[13px]">
          <Lock className="size-4 shrink-0 text-subtle" />
          <span className="text-muted">
            <span className="font-semibold text-foreground">Score {lead.score}</span> · {timeAgo(lead.ageHours)} ·{" "}
            {lead.replyCount} replies
          </span>
        </div>
        <button
          onClick={onUnlock}
          className="focus-ring shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-white transition-colors"
          style={{ background: "var(--accent)" }}
        >
          Unlock
        </button>
      </div>
    </article>
  );
}
