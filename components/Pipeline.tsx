"use client";

import { useState } from "react";
import { Arrow, Bookmark } from "./Icons";
import { timeAgo } from "./LeadCard";

export type SavedStatus = "new" | "contacted" | "replied" | "won" | "dead";

export type SavedLead = {
  _id: string;
  postId: string;
  username: string;
  fullName?: string;
  text: string;
  url: string;
  profileUrl: string;
  score: number;
  postedAt: string;
  status: SavedStatus;
  notes?: string;
  savedAt: number;
};

const STATUSES: { value: SavedStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "won", label: "Won" },
  { value: "dead", label: "Dead" },
];

export default function Pipeline({
  leads,
  onStatus,
  onNotes,
  onRemove,
  onBack,
}: {
  leads: SavedLead[];
  onStatus: (postId: string, status: SavedStatus) => void;
  onNotes: (postId: string, notes: string) => void;
  onRemove: (postId: string) => void;
  onBack: () => void;
}) {
  const [filter, setFilter] = useState<SavedStatus | "all">("all");
  const [q, setQ] = useState("");
  // Read the clock once per mount so row ages stay stable across re-renders.
  const [now] = useState(() => Date.now());
  const needle = q.trim().toLowerCase();
  const shown = leads
    .filter((l) => (filter === "all" ? true : l.status === filter))
    .filter((l) =>
      !needle
        ? true
        : l.username.toLowerCase().includes(needle) ||
          (l.fullName ?? "").toLowerCase().includes(needle) ||
          l.text.toLowerCase().includes(needle) ||
          (l.notes ?? "").toLowerCase().includes(needle)
    );

  const counts = STATUSES.map((s) => ({
    ...s,
    count: leads.filter((l) => l.status === s.value).length,
  }));

  if (!leads.length) {
    return (
      <div className="card p-10 text-center">
        <Bookmark className="mx-auto size-6 text-subtle" />
        <p className="mt-3 text-[15px] font-medium">No saved leads yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[14px] text-muted">
          Hit <span className="font-medium text-foreground">Save</span> on a lead to start
          working it here — track who you’ve contacted and who replied.
        </p>
        <button
          onClick={onBack}
          className="focus-ring mt-5 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          Find leads <Arrow className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search saved leads — handle, post text or notes…"
          aria-label="Search saved leads"
          className="focus-ring w-full rounded-lg border px-3 py-2 text-[13.5px] outline-none placeholder:text-subtle"
          style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className="focus-ring rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors"
          style={
            filter === "all"
              ? { background: "var(--accent-soft)", color: "var(--accent)" }
              : { color: "var(--muted)" }
          }
        >
          All {leads.length}
        </button>
        {counts.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className="focus-ring rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors"
            style={
              filter === s.value
                ? { background: "var(--accent-soft)", color: "var(--accent)" }
                : { color: "var(--muted)" }
            }
          >
            {s.label} {s.count}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-[14.5px] font-medium">No leads match</p>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {needle ? `Nothing for "${q.trim()}".` : "Nothing in this stage yet."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {shown.map((lead) => (
          <SavedRow
            key={lead._id}
            lead={lead}
            now={now}
            onStatus={onStatus}
            onNotes={onNotes}
            onRemove={onRemove}
          />
        ))}
      </div>
    </>
  );
}

function SavedRow({
  lead,
  now,
  onStatus,
  onNotes,
  onRemove,
}: {
  lead: SavedLead;
  now: number;
  onStatus: (postId: string, status: SavedStatus) => void;
  onNotes: (postId: string, notes: string) => void;
  onRemove: (postId: string) => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const ageHours = Math.max(0, (now - new Date(lead.postedAt).getTime()) / 36e5);

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={lead.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring truncate rounded text-[15px] font-semibold hover:underline"
          >
            @{lead.username}
          </a>
          {lead.fullName && <p className="truncate text-[13px] text-muted">{lead.fullName}</p>}
        </div>
        <select
          value={lead.status}
          onChange={(e) => onStatus(lead.postId, e.target.value as SavedStatus)}
          aria-label={`Status for @${lead.username}`}
          className="focus-ring shrink-0 rounded-lg border px-2 py-1 text-[12.5px] font-medium"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--foreground)" }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
        {lead.text}
      </p>

      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        onBlur={() => {
          if (dirty) {
            onNotes(lead.postId, notes);
            setDirty(false);
          }
        }}
        rows={2}
        placeholder="Notes — what you sent, what they said…"
        className="focus-ring mt-3 w-full resize-y rounded-lg border px-2.5 py-2 text-[13px] outline-none placeholder:text-subtle"
        style={{ borderColor: "var(--border)", background: "var(--surface-muted)" }}
      />

      <div
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-[12.5px] text-subtle"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="tabular-nums">Posted {timeAgo(ageHours)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">Score {lead.score}</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => onRemove(lead.postId)}
            className="focus-ring rounded font-medium text-muted hover:text-foreground"
          >
            Remove
          </button>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex items-center gap-1 rounded font-semibold text-white hover:underline"
          >
            Open thread <Arrow className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
