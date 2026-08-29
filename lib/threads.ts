export type ThreadsPost = {
  type: string;
  postId: string;
  code: string;
  username: string;
  fullName: string | null;
  isVerified: boolean;
  text: string;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  quoteCount: number;
  mediaType: string;
  isReply: boolean;
  isRepost: boolean;
  timestamp: number;
  date: string;
  url: string;
  searchQuery?: string;
};

export type Lead = ThreadsPost & {
  score: number;
  signals: string[];
  ageHours: number;
  profileUrl: string;
};

const ACTOR = process.env.APIFY_THREADS_ACTOR || "automation-lab~threads-scraper";

/** Buying-intent phrases, weighted. Tuned against real Threads search output. */
const INTENT = [
  { re: /\b(looking for|in search of|need(?:ing)? (?:a|an|some)|searching for)\b/i, w: 30, tag: "Looking for" },
  { re: /\b(anyone know|any recommendations|recommend(?:ations)? for|who (?:can|does|should i))\b/i, w: 24, tag: "Asking for recs" },
  { re: /\b(hiring|we're hiring|open role|job opening|freelancer|contractor)\b/i, w: 26, tag: "Hiring" },
  { re: /\b(dm me|drop your|send me|reach out|comment below|link below)\b/i, w: 18, tag: "Wants replies" },
  { re: /\b(budget|paid|will pay|rates?|quote|pricing|how much)\b/i, w: 20, tag: "Budget mentioned" },
  { re: /\b(asap|urgent(?:ly)?|this week|right now|immediately)\b/i, w: 14, tag: "Urgent" },
  { re: /\b(help me|can someone|struggling with|frustrated with|problem with)\b/i, w: 12, tag: "Pain point" },
  { re: /\b(my business|my company|my brand|our team|startup|small business)\b/i, w: 10, tag: "Business owner" },
];

function scoreLead(p: ThreadsPost, now: number) {
  const signals: string[] = [];
  let score = 0;
  const text = p.text || "";

  for (const { re, w, tag } of INTENT) {
    if (re.test(text)) {
      score += w;
      signals.push(tag);
    }
  }

  // Recency is the dominant ranking factor — a 40-point decay over 14 days.
  const ageHours = Math.max(0, (now - p.timestamp * 1000) / 36e5);
  score += Math.max(0, 40 - (ageHours / 24) * (40 / 14));
  if (ageHours <= 24) signals.push("Posted today");
  else if (ageHours <= 72) signals.push("Last 3 days");

  // Engagement means the post has traction, but replies also mean competition,
  // so reward it far less than intent or freshness.
  score += Math.min(12, Math.log1p(p.replyCount + p.likeCount) * 2.5);

  // A question mark is a strong, cheap proxy for someone actively asking.
  if (text.includes("?")) score += 6;

  // Replies and reposts are rarely the origin of a lead.
  if (p.isReply) score -= 15;
  if (p.isRepost) score -= 25;

  return { score: Math.round(score), signals: [...new Set(signals)], ageHours };
}

/**
 * Threads is full of copy-pasted "looking for X" posts reshared verbatim by
 * engagement accounts. Fingerprint the wording so only the best-ranked copy survives.
 */
function fingerprint(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function searchLeads(opts: {
  queries: string[];
  maxPosts?: number;
  daysBack?: number;
}): Promise<Lead[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not configured");

  const queries = opts.queries.map((q) => q.trim()).filter(Boolean).slice(0, 5);
  if (!queries.length) return [];

  const daysBack = opts.daysBack ?? 30;
  const postedAfter = new Date(Date.now() - daysBack * 864e5).toISOString().slice(0, 10);

  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "search",
        searchQueries: queries,
        maxPosts: Math.min(opts.maxPosts ?? 50, 200),
        postedAfter,
        includeProfile: false,
      }),
      // The actor routinely needs a minute or two for multi-keyword searches.
      signal: AbortSignal.timeout(280_000),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Apify returned ${res.status}: ${detail.slice(0, 200)}`);
  }

  const items = (await res.json()) as ThreadsPost[];
  const now = Date.now();
  const seen = new Set<string>();
  const leads: Lead[] = [];

  for (const p of items) {
    if (p.type !== "post" || !p.postId || seen.has(p.postId)) continue;
    seen.add(p.postId);
    // The actor's own date filter is best-effort, so enforce the window here too.
    if (now - p.timestamp * 1000 > daysBack * 864e5) continue;
    const { score, signals, ageHours } = scoreLead(p, now);
    leads.push({
      ...p,
      score,
      signals,
      ageHours,
      profileUrl: `https://www.threads.com/@${p.username}`,
    });
  }

  return rankLeads(leads);
}

/**
 * Newest first is the headline promise, so posts are bucketed by day and score
 * only breaks ties inside a bucket. Exported so the route can re-rank after
 * Gemini replaces the regex scores.
 */
export function rankLeads(leads: Lead[]): Lead[] {
  const sorted = [...leads].sort((a, b) => {
    const dayA = Math.floor(a.ageHours / 24);
    const dayB = Math.floor(b.ageHours / 24);
    if (dayA !== dayB) return dayA - dayB;
    return b.score - a.score;
  });

  // Drop verbatim reposts after ranking, so the copy that survives is the best one.
  const byText = new Set<string>();
  return sorted.filter((lead) => {
    const fp = fingerprint(lead.text);
    if (fp.length < 25) return true;
    if (byText.has(fp)) return false;
    byText.add(fp);
    return true;
  });
}
