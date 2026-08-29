import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { CACHE_TTL_MS } from "./constants";

const leadFields = {
  postId: v.string(),
  username: v.string(),
  fullName: v.optional(v.string()),
  isVerified: v.boolean(),
  text: v.string(),
  likeCount: v.number(),
  replyCount: v.number(),
  date: v.string(),
  timestamp: v.number(),
  url: v.string(),
  profileUrl: v.string(),
  score: v.number(),
  signals: v.array(v.string()),
};

/** Returns a cached scrape if one is still fresh, otherwise null. */
export const get = query({
  args: { cacheKey: v.string() },
  handler: async (ctx, { cacheKey }) => {
    const search = await ctx.db
      .query("searches")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (!search) return null;
    if (Date.now() - search.ranAt > CACHE_TTL_MS) return null;

    const leads = await ctx.db
      .query("cachedLeads")
      .withIndex("by_search", (q) => q.eq("searchId", search._id))
      .collect();

    return { ranAt: search.ranAt, leads };
  },
});

/** Stores a fresh scrape, replacing any previous rows for the same key. */
export const save = mutation({
  args: {
    cacheKey: v.string(),
    keywords: v.array(v.string()),
    daysBack: v.number(),
    leads: v.array(v.object(leadFields)),
  },
  handler: async (ctx, { cacheKey, keywords, daysBack, leads }) => {
    const previous = await ctx.db
      .query("searches")
      .withIndex("by_cache_key", (q) => q.eq("cacheKey", cacheKey))
      .first();

    if (previous) {
      const stale = await ctx.db
        .query("cachedLeads")
        .withIndex("by_search", (q) => q.eq("searchId", previous._id))
        .collect();
      await Promise.all(stale.map((row) => ctx.db.delete(row._id)));
      await ctx.db.delete(previous._id);
    }

    const searchId = await ctx.db.insert("searches", {
      cacheKey,
      keywords,
      daysBack,
      leadCount: leads.length,
      ranAt: Date.now(),
    });

    await Promise.all(leads.map((lead) => ctx.db.insert("cachedLeads", { searchId, ...lead })));
    return { searchId };
  },
});
