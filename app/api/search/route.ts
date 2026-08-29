import { NextResponse } from "next/server";
import { searchLeads, type Lead } from "@/lib/threads";
import { ensureVisitorId, resolveEntitlement, recordTrialUse } from "@/lib/entitlement";
import { getConvex, fns, cacheKeyFor, type LeadRow } from "@/lib/convex";

export const maxDuration = 300;

function redact(lead: Lead | (LeadRow & { ageHours: number })) {
  return {
    postId: lead.postId,
    locked: true as const,
    date: lead.date,
    ageHours: lead.ageHours,
    score: lead.score,
    signals: lead.signals,
    replyCount: lead.replyCount,
    likeCount: lead.likeCount,
    preview: lead.text.slice(0, 55).trim(),
  };
}

/** Convex stores plain rows; ageHours is derived per-request so it never goes stale. */
function toLead(row: LeadRow): Lead {
  return {
    ...row,
    fullName: row.fullName ?? null,
    type: "post",
    code: "",
    repostCount: 0,
    quoteCount: 0,
    mediaType: "text",
    isReply: false,
    isRepost: false,
    ageHours: Math.max(0, (Date.now() - row.timestamp * 1000) / 36e5),
  } as Lead;
}

function toRow(lead: Lead): LeadRow {
  return {
    postId: lead.postId,
    username: lead.username,
    fullName: lead.fullName ?? undefined,
    isVerified: lead.isVerified,
    text: lead.text,
    likeCount: lead.likeCount,
    replyCount: lead.replyCount,
    date: lead.date,
    timestamp: lead.timestamp,
    url: lead.url,
    profileUrl: lead.profileUrl,
    score: lead.score,
    signals: lead.signals,
  };
}

export async function POST(req: Request) {
  let body: { keywords?: string; daysBack?: number; maxPosts?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const keywords = (body.keywords || "")
    .split(/[\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  if (!keywords.length) {
    return NextResponse.json({ error: "Enter at least one keyword." }, { status: 400 });
  }

  const daysBack = Math.min(Math.max(body.daysBack ?? 30, 1), 365);
  const carrier = NextResponse.json({});
  const visitorId = await ensureVisitorId(carrier);
  const ent = await resolveEntitlement(visitorId);

  const convex = getConvex();
  const cacheKey = cacheKeyFor(keywords, daysBack);

  let leads: Lead[] | null = null;
  let cached = false;

  if (convex) {
    try {
      const hit = await convex.query(fns.cacheGet, { cacheKey });
      if (hit) {
        leads = hit.leads.map(toLead).sort((a, b) => {
          const dayA = Math.floor(a.ageHours / 24);
          const dayB = Math.floor(b.ageHours / 24);
          return dayA !== dayB ? dayA - dayB : b.score - a.score;
        });
        cached = true;
      }
    } catch (err) {
      console.error("[threadly] cache read failed:", err);
    }
  }

  if (!leads) {
    try {
      leads = await searchLeads({
        queries: keywords,
        daysBack,
        maxPosts: ent.licensed ? Math.min(body.maxPosts ?? 50, 200) : 25,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed.";
      const timedOut = /timeout|aborted/i.test(message);
      return NextResponse.json(
        {
          error: timedOut
            ? "Threads search timed out. Try fewer keywords or a shorter date range."
            : message,
        },
        { status: timedOut ? 504 : 502 }
      );
    }

    if (convex && leads.length) {
      try {
        await convex.mutation(fns.cacheSave, {
          cacheKey,
          keywords,
          daysBack,
          leads: leads.map(toRow),
        });
      } catch (err) {
        console.error("[threadly] cache write failed:", err);
      }
    }
  }

  const payload = ent.licensed
    ? {
        licensed: true,
        total: leads.length,
        unlocked: leads,
        locked: [],
        trialRemaining: null,
        cached,
        backend: ent.backend,
      }
    : (() => {
        const remaining = Math.max(0, ent.freeLimit - ent.leadsUsed);
        const unlocked = leads.slice(0, remaining);
        return {
          licensed: false,
          total: leads.length,
          unlocked,
          locked: leads.slice(remaining).map(redact),
          trialRemaining: Math.max(0, remaining - unlocked.length),
          freeLimit: ent.freeLimit,
          cached,
          backend: ent.backend,
        };
      })();

  const res = NextResponse.json(payload);
  // Carry over any visitor cookie minted on the throwaway carrier response.
  carrier.cookies.getAll().forEach((c) => res.cookies.set(c));

  if (!ent.licensed && payload.unlocked.length) {
    await recordTrialUse(visitorId, payload.unlocked.length, res, ent.leadsUsed);
  }

  return res;
}
