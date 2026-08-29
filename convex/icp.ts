import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** The most recent ICP for this visitor, used to prefill the dashboard. */
export const get = query({
  args: { visitorId: v.string() },
  handler: async (ctx, { visitorId }) => {
    return await ctx.db
      .query("icpProfiles")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .order("desc")
      .first();
  },
});

/** Analysing a site costs a fetch plus an LLM call, so results are reused. */
export const getByUrl = query({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    return await ctx.db
      .query("icpProfiles")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();
  },
});

export const save = mutation({
  args: {
    visitorId: v.string(),
    url: v.string(),
    business: v.string(),
    sells: v.string(),
    idealCustomer: v.string(),
    keywords: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("icpProfiles")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .filter((q) => q.eq(q.field("url"), args.url))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...args, analysedAt: Date.now() });
      return { id: existing._id, updated: true };
    }
    const id = await ctx.db.insert("icpProfiles", { ...args, analysedAt: Date.now() });
    return { id, updated: false };
  },
});
