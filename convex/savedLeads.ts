import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const status = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("replied"),
  v.literal("won"),
  v.literal("dead")
);

export const list = query({
  args: { visitorId: v.string() },
  handler: async (ctx, { visitorId }) => {
    const leads = await ctx.db
      .query("savedLeads")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .collect();
    return leads.sort((a, b) => b.savedAt - a.savedAt);
  },
});

/** Saving an already-saved post is a no-op, so the button is safe to double-click. */
export const save = mutation({
  args: {
    visitorId: v.string(),
    postId: v.string(),
    username: v.string(),
    fullName: v.optional(v.string()),
    text: v.string(),
    url: v.string(),
    profileUrl: v.string(),
    score: v.number(),
    postedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("savedLeads")
      .withIndex("by_visitor_post", (q) =>
        q.eq("visitorId", args.visitorId).eq("postId", args.postId)
      )
      .first();

    if (existing) return { id: existing._id, alreadySaved: true };

    const now = Date.now();
    const id = await ctx.db.insert("savedLeads", {
      ...args,
      status: "new" as const,
      savedAt: now,
      updatedAt: now,
    });
    return { id, alreadySaved: false };
  },
});

export const setStatus = mutation({
  args: { visitorId: v.string(), postId: v.string(), status },
  handler: async (ctx, { visitorId, postId, status }) => {
    const lead = await ctx.db
      .query("savedLeads")
      .withIndex("by_visitor_post", (q) => q.eq("visitorId", visitorId).eq("postId", postId))
      .first();
    if (!lead) return { updated: false };
    await ctx.db.patch(lead._id, { status, updatedAt: Date.now() });
    return { updated: true };
  },
});

export const setNotes = mutation({
  args: { visitorId: v.string(), postId: v.string(), notes: v.string() },
  handler: async (ctx, { visitorId, postId, notes }) => {
    const lead = await ctx.db
      .query("savedLeads")
      .withIndex("by_visitor_post", (q) => q.eq("visitorId", visitorId).eq("postId", postId))
      .first();
    if (!lead) return { updated: false };
    await ctx.db.patch(lead._id, { notes, updatedAt: Date.now() });
    return { updated: true };
  },
});

export const remove = mutation({
  args: { visitorId: v.string(), postId: v.string() },
  handler: async (ctx, { visitorId, postId }) => {
    const lead = await ctx.db
      .query("savedLeads")
      .withIndex("by_visitor_post", (q) => q.eq("visitorId", visitorId).eq("postId", postId))
      .first();
    if (!lead) return { removed: false };
    await ctx.db.delete(lead._id);
    return { removed: true };
  },
});
